# DevCast — Latency Reduction Options & Strategy

Stage: In Progress

## Overview

**Current Latency:** 11–20+ seconds end-to-end
**Target Latency:** 2–4 seconds
**Gap to close:** ~8–16 seconds

This document ranks every available latency-reduction strategy from highest to lowest impact for the DevCast stack (OBS → Nginx RTMP → Caddy → HLS.js). Each strategy is tagged with effort level, estimated saving, and a concrete implementation plan.

---

## Latency Budget Recap

| Stage | Current Cost | Reducible To |
| --- | --- | --- |
| OBS Keyframe / GOP | 2–6 s | 1 s |
| Nginx segment packaging | 2 s | 0.5–1 s |
| Storage I/O (SSD) | 0.05–0.2 s | ~0 s (tmpfs) |
| Manifest polling | 1–2 s | 0.5 s |
| Player buffer (HLS.js) | 6–8 s | 1–2 s |
| Network RTT (India ↔ HK) | 0.08–0.15 s | Negligible |
| **Total** | **~11–20 s** | **~3–5 s** |

---

## Strategy Rankings

### 🥇 Rank 1 — Fix OBS Keyframe Interval

<aside>
🔥

**Estimated saving: 2–6 seconds | Effort: 5 minutes | Zero server changes**
The single most impactful change — requires no code or deployment.

</aside>

**Why it matters:**
Nginx RTMP can only cut a new `.ts` segment on an IDR keyframe. If OBS sends a keyframe every 8 seconds, `hls_fragment 2s` in Nginx is ignored — segments become 8 s regardless. Locking OBS to a 1-second keyframe interval guarantees Nginx can produce 1-second chunks.

**Implementation:**

1. Open OBS Studio → **Settings → Output → Encoding**
2. Switch Output Mode to **Advanced**
3. Under **Keyframe Interval**, set to **`1`** (seconds) — do **not** leave at `0` (Auto)
4. Recommended encoder settings for low-latency:
    - Encoder: `x264` or NVENC if GPU available
    - Rate Control: `CBR`
    - Bitrate: `2500–4000 kbps` for 720p
    - Profile: `baseline` or `main`
    - Tune: `zerolatency` (x264 only — critical)
5. Click **Apply → OK**, restart the stream

```json
// OBS encoder config reference
{
  "keyint_sec": 1,
  "rate_control": "CBR",
  "preset": "veryfast",
  "tune": "zerolatency"
}
```

**Expected result:** Segments will now actually be cut at 2 s (or shorter if you reduce `hls_fragment`). Alone, this saves 2–6 s.

---

### 🥈 Rank 2 — Reduce HLS.js Player Buffer (liveSyncDurationCount)

<aside>
🎯

**Estimated saving: 4–6 seconds | Effort: 15 minutes | Client-only change**
The player buffer is the largest single source of accumulated delay in your stack.

</aside>

**Why it matters:**
Even with `lowLatencyMode: true`, HLS.js defaults to `liveSyncDurationCount: 3` — 3 segments behind live edge. With 2-second segments, that's 6 seconds of deliberate lag. Reducing to 1 segment cuts the buffer to 2 seconds.

**Implementation — `client/src/components/VideoPlayer.tsx`:**

```tsx
const hls = new Hls({
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 10,           // was 30 — reduce back buffer

  // Live sync: how many segments behind live edge to stay
  liveSyncDurationCount: 1,       // was 3 (default) — KEY CHANGE
  liveMaxLatencyDurationCount: 3, // allow up to 3 before triggering catchup

  // Speed up playback when drifting behind live edge
  liveCatchUpMinChunkRatio: 0.5,
  liveCatchUpPlaybackRate: 0.5,   // plays at 1.5× speed when catching up

  // Faster manifest polling
  manifestLoadingTimeOut: 4000,
  manifestLoadingMaxRetry: 3,
  levelLoadingTimeOut: 4000,
});
hls.loadSource(effectiveUrl);
hls.attachMedia(video);
```

**Trade-off:** With 1-segment buffer, viewers on unstable connections may see occasional rebuffering. Consider a UI toggle: "Low Latency" vs. "Stable" mode.

**Expected result:** Saves 4–6 s. Combined with Rank 1, you're targeting 3–5 s total latency.

---

### 🥉 Rank 3 — Reduce Nginx Segment Duration to 1 second

<aside>
⚙️

**Estimated saving: 1 second | Effort: 5 minutes | Nginx config + redeploy**
A direct halving of the packaging window. Requires Rank 1 first.

</aside>

**Why it matters:**
Every segment must be fully finalized before it enters the playlist. Cutting `hls_fragment` from 2 s to 1 s reduces the packaging window by 1 second. Requires OBS keyframe interval to also be 1 s.

**Implementation — `media-server/nginx.prod.conf`:**

```
rtmp {
  server {
    listen 1935;
    application live {
      live on;
      on_publish http://api:3000/api/streams/rtmp/auth;
      on_publish_done http://api:3000/api/streams/rtmp/done;

      hls on;
      hls_path /var/hls/live;
      hls_fragment 1s;          # ← was 2s
      hls_playlist_length 6s;   # ← was 10s (keep 3–6 segments in playlist)

      record all;
      record_path /var/hls/recordings;
      record_unique on;
      exec_record_done /etc/nginx/vod_process.sh $path $name;
    }
  }
}
```

```bash
# Redeploy RTMP container only
docker compose -f docker-compose.prod.yml up -d --build rtmp
```

**Expected result:** ~1 s reduction in packaging delay.

---

### Rank 4 — Mount HLS Segments on tmpfs (RAM Disk)

<aside>
💾

**Estimated saving: 0.1–0.3 seconds | Effort: 20 minutes | docker-compose change**
Eliminates disk I/O entirely from the hot path.

</aside>

**Why it matters:**
`.ts` segments are currently written to Azure Standard SSD. RAM (tmpfs) is orders of magnitude faster for small sequential writes, eliminating the 50–200ms disk I/O latency in the segment pipeline.

**Implementation — `docker-compose.prod.yml`:**

```yaml
services:
  rtmp:
    volumes:
      - hls_live:/var/hls/live          # ← now RAM-backed
      - /opt/devcast/data/hls/recordings:/var/hls/recordings  # SSD OK for VOD

  caddy:
    volumes:
      - hls_live:/var/hls/live          # ← same RAM volume
      - /opt/devcast/data/hls/vod:/var/hls/vod

volumes:
  hls_live:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: "size=512m,mode=1777"          # 512 MB RAM cap
```

```bash
# Check available RAM before enabling (B2s has 4 GiB total)
free -h
# Live HLS segments are tiny — <50 MB at any moment, 512 MB is safe
```

**⚠️ Note:** Live segments are ephemeral — container restart loses in-progress segments. Acceptable since live streams don't need replay. VOD stays on SSD.

**Expected result:** ~0.1–0.3 s saving.

---

### Rank 5 — WebSocket Push for Segment-Ready Notifications

<aside>
📡

**Estimated saving: 0.5–1.5 seconds | Effort: 2–4 hours | Server + client changes**
Replaces manifest polling with push-based segment discovery.

</aside>

**Why it matters:**
HLS.js polls the `.m3u8` manifest every ~1–2 seconds to discover new segments. Between polls, new segments sit on the server invisible to the client. Pushing a notification the instant a segment is ready eliminates this wait.

**Option A — WebSocket push (recommended, you already have `ws:3001`):**

```jsx
// api:3000 — new webhook endpoint for Nginx on_hls_done
app.post('/api/streams/hls/segment', (req, res) => {
  const { streamKey } = req.body;
  // Notify all viewers of this stream via Socket.io room
  io.to(`stream:${streamKey}`).emit('segment:ready');
  res.sendStatus(200);
});
```

```
# nginx.prod.conf — add segment notification hook
application live {
  # ... existing config ...
  exec_publish_done /etc/nginx/notify_segment.sh $name;
}
```

```tsx
// VideoPlayer.tsx — trigger immediate manifest reload
socket.on('segment:ready', () => {
  hls.stopLoad();
  hls.startLoad(-1); // re-poll manifest immediately
});
```

**Expected result:** Eliminates the polling gap — saves 0.5–1.5 s.

---

### Rank 6 — Switch to Low-Latency HLS (LL-HLS) with Partial Segments

<aside>
🚀

**Estimated saving: 1–3 additional seconds | Effort: 1–3 days | Protocol-level migration**
LL-HLS is the protocol-native solution for sub-3-second streaming.

</aside>

**Why it matters:**
LL-HLS (Apple RFC 8216bis) introduces **Partial Segments** — the server publishes 200ms chunks of a segment before the full segment is complete. This reduces the packaging window from `hls_fragment` (1–2 s) to ~0.2 s.

**Current blocker:** `nginx-rtmp-module` does **not** support LL-HLS. Requires switching media servers.

**Migration: Replace Nginx RTMP with MediaMTX:**

```yaml
# docker-compose.prod.yml
  rtmp:
    image: bluenviron/mediamtx:latest
    ports:
      - "1935:1935"
      - "8888:8888"   # LL-HLS port
    volumes:
      - ./mediamtx.yml:/mediamtx.yml
      - hls_live:/hls
```

```yaml
# mediamtx.yml
paths:
  live:
    runOnPublish: ""
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsSegmentCount: 3
hlsSegmentDuration: 1s
hlsPartDuration: 200ms    # ← partial segments — the LL-HLS key
hlsDirectory: /hls
```

```tsx
// VideoPlayer.tsx — HLS.js already supports LL-HLS natively
const hls = new Hls({
  lowLatencyMode: true,   // enables LL-HLS consumption
  liveSyncDurationCount: 1,
});
```

**Trade-offs:**

- MediaMTX is newer and less battle-tested than Nginx RTMP
- LL-HLS requires HLS.js v1.2+ (check your version)
- More HTTP requests per second — test CPU on burstable B2s
- Webhook auth (`on_publish`) works differently in MediaMTX — re-implement

**Expected result:** Combined with Ranks 1–4, can bring total latency to **1.5–3 seconds** — below your 4-second target.

---

### Rank 7 — Move VM Region to Central India

<aside>
🌏

**Estimated saving: ~80ms network RTT | Effort: 1–2 hours | VM re-deployment**
Small absolute gain but worth doing for India-based audiences.

</aside>

**Why it matters:**
Broadcaster + most viewers are in India. The East Asia (Hong Kong) VM adds ~80–120ms of unnecessary round-trip latency. Central India reduces this to <10ms for local viewers.

**Steps:**

1. Check quota: Azure Portal → Subscriptions → Usage + Quotas → filter `centralindia`
2. If quota available: create new VM in `centralindia` with same SKU (`Standard_B2als_v2`)
3. Copy `.env.prod` and `docker-compose.prod.yml`
4. Re-run host volume setup:

```bash
sudo mkdir -p /opt/devcast/data/{postgres,redis,hls/live,hls/vod,hls/recordings,sandbox-tmp}
sudo chmod -R 777 /opt/devcast/data
```

1. Update Azure Public IP DNS label
2. Update `DOMAIN` in `.env.prod`, redeploy — Caddy auto-provisions new cert

**Note:** If audience is globally distributed, Hong Kong (East Asia) may be better for Southeast Asian viewers. Central India wins only for India-first audiences.

---

### Rank 8 — Adaptive Bitrate (ABR) Ladder via FFmpeg

<aside>
📊

**Estimated saving: Prevents latency spikes from rebuffering | Effort: 4–8 hours | CPU-intensive**
A stability improvement — prevents the player from falling back to higher buffer depths during congestion.

</aside>

**Why it matters:**
All viewers currently receive the same bitrate regardless of connection quality. On poor connections, viewers rebuffer, causing HLS.js to fall back to buffering more segments — dynamically increasing latency. ABR lets viewers' players automatically switch to a lower bitrate rather than stalling.

**Implementation:**

```
application live {
  live on;
  # Transcode to two quality levels
  exec ffmpeg -i rtmp://localhost/live/$name
    -c:v libx264 -preset veryfast -tune zerolatency
      -b:v 2500k -s 1280x720 -c:a aac -b:a 128k
      -f flv rtmp://localhost/hls720/$name
    -c:v libx264 -preset veryfast -tune zerolatency
      -b:v 800k -s 854x480 -c:a aac -b:a 96k
      -f flv rtmp://localhost/hls480/$name;
}
```

**⚠️ Critical caveat for B2s:** FFmpeg software transcoding will likely saturate the 2 vCPU burstable VM. Test with `htop` during a live stream before enabling in production. Only viable if you have burst credits available or upgrade SKU.

---

## Implementation Roadmap

| Priority | Action | Time | Expected Saving |
| --- | --- | --- | --- |
| **1** | OBS: Keyframe Interval = 1s, tune = zerolatency | 5 min | **2–6 s** |
| **2** | HLS.js: `liveSyncDurationCount: 1`  • catchup config | 15 min | **4–6 s** |
| **3** | Nginx: `hls_fragment 1s`, `hls_playlist_length 6s` | 5 min | **1 s** |
| **4** | docker-compose: mount `/var/hls/live` as tmpfs | 20 min | **0.1–0.3 s** |
| **5** | WebSocket push on segment-ready events | 2–4 h | **0.5–1.5 s** |
| **6** | Migrate to MediaMTX + enable LL-HLS (200ms partials) | 1–3 days | **1–3 s additional** |
| **7** | Move VM to Central India region | 1–2 h | **~0.08 s** |
| **8** | ABR via FFmpeg (if CPU headroom allows) | 4–8 h | Stability only |

**Doing Ranks 1–4 alone gets you from ~15 s to ~4–6 s. Ranks 1–6 together gets you to ~1.5–3 s.**

---

## Quick Win Checklist (Do Today — No Deployment Needed for #1)

- [ ]  OBS → Settings → Output → Keyframe Interval = **1** (seconds)
- [ ]  OBS → x264 → Tune = **zerolatency**
- [ ]  `VideoPlayer.tsx` → add `liveSyncDurationCount: 1` and `liveCatchUpPlaybackRate: 0.5`
- [ ]  `nginx.prod.conf` → `hls_fragment 1s;` and `hls_playlist_length 6s;`
- [ ]  `docker-compose.prod.yml` → mount `hls_live` as `tmpfs`
- [ ]  Redeploy: `docker compose -f docker-compose.prod.yml up -d --build`
- [ ]  Measure latency after each step (see method below)

---

## How to Measure Latency Accurately

**Manual method (most reliable):**

1. Put a stopwatch visible in your OBS scene
2. Start streaming
3. Screenshot the viewer browser showing the stopwatch
4. Delta between real time and on-screen time = end-to-end latency

**Programmatic method via HLS.js:**

```tsx
hls.on(Hls.Events.FRAG_LOADED, () => {
  console.log('Live latency:', hls.latency.toFixed(2), 's');
  console.log('Live edge:', hls.liveSyncPosition?.toFixed(2), 's');
});
```

**Target after Ranks 1–4:** latency ≤ 5 seconds
**Target after Ranks 1–6:** latency ≤ 3 seconds
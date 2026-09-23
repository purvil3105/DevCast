# DevCast — Oracle Cloud Always Free ARM64 Deployment Plan

> **Based on actual repository inspection of `purvil3105/DevCast` (main branch, September 2026).**\
> All "existing" claims are verified from the repo. "Proposed" means new work required.\
> Nothing in this plan has been executed or tested — it is a blueprint only.

---

## Table of Contents

1. [Current Architecture & Deployment Gaps](#1-current-architecture--deployment-gaps)
2. [Files to Modify or Create](#2-files-to-modify-or-create)
3. [ARM64 Compatibility Issues](#3-arm64-compatibility-issues)
4. [Production `docker-compose.prod.yml` Design](#4-production-docker-composeprodymml-design)
5. [Replacing S3 with Local VOD Storage](#5-replacing-s3-with-local-vod-storage)
6. [Caddy / HTTPS / Networking Changes](#6-caddy--https--networking-changes)
7. [Production Environment Variables & Secrets](#7-production-environment-variables--secrets)
8. [Security Issues](#8-security-issues)
9. [Oracle VM Deployment Steps](#9-oracle-vm-deployment-steps)
10. [End-to-End Verification Checklist](#10-end-to-end-verification-checklist)
11. [Resource & Performance Risks](#11-resource--performance-risks)
12. [Final Ordered Checklist of Changes](#12-final-ordered-checklist-of-changes)

---

## 1. Current Architecture & Deployment Gaps

### What Exists Today

The repository ships a **development-only** `docker-compose.yml` with seven services:

| Service | Image/Build | Ports | Key Notes |
| --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | 5432 | Dev password, named volume `pgdata` |
| `redis` | `redis:7-alpine` | 6379 | 128 MB maxmemory, no password |
| `rtmp` | `./media-server` | 1935, 8080 | Mounts `nginx.conf` read-only; has `s3_upload.sh` callback |
| `api` | `./server` | 3000 | Runs `prisma db push && db:seed` on every start |
| `ws` | `./server` | 3001 | Separate Socket.IO process |
| `sandbox` | `./sandbox` | 4000 | Mounts `/var/run/docker.sock` |
| `client` | `./client` | 80 | Built with `VITE_API_URL` / `VITE_WS_URL` build args |

The current compose uses `NODE_ENV=development` for both `api` and `ws`, which intentionally bypasses the server's production secret-strength check.

**External services currently required:**

- **Neon** — managed PostgreSQL (`DATABASE_URL` in `.env.example` points to `*.neon.tech`)
- **Upstash** — managed Redis (`REDIS_URL` points to `*.upstash.io`)
- **Cloudinary** — stream thumbnail uploads (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`)
- **S3** — VOD recording upload (`s3_upload.sh` in `media-server/` calls the API server after upload)

### Deployment Gaps

| Gap | Impact |
| --- | --- |
| No HTTPS/TLS anywhere | All traffic plaintext; WebSocket won't work over `wss://` |
| No reverse proxy | Ports 3000, 3001, 4000, 8080, 1935 all exposed separately |
| `prisma db push + db:seed` in API start command | Runs schema migration **and** seeds demo data on every restart in production |
| `NODE_ENV=development` in compose | Allows weak JWT secrets; disables production security checks |
| Hardcoded dev secrets | `JWT_SECRET=devcast-dev-secret-change-in-production`, `INTERNAL_API_SECRET=dev-internal-secret-change-me` |
| Redis has no password | Anyone who reaches port 6379 can read/write all queues and sessions |
| No health checks in compose | Docker can't detect unhealthy containers; Caddy upstreams may route to dead services |
| S3 dependency for VOD | Requires AWS credentials; can't use on a free VM without external storage |
| Cloudinary dependency for thumbnails | Optional per README, but currently wired in |
| `/var/run/docker.sock` mounted in sandbox | Full host Docker access from a code-execution container |
| VITE URLs baked at build time | Must rebuild client container whenever domain changes |
| No log rotation configured | Redis AOF or nginx logs can fill the 200 GB VM disk |
| `version: '3.8'` at top of compose | Deprecated in Compose v2; harmless but should be removed |

---

## 2. Files to Modify or Create

The following is a complete map — no file in this list is touched by this plan itself, only described.

### Files to **Create** (do not yet exist)

```
docker-compose.prod.yml          # Production compose — the main deliverable
Caddyfile                        # Reverse proxy, HTTPS, routing
media-server/Dockerfile          # Must be rewritten for ARM64 (see §3)
media-server/entrypoint.sh       # Replace s3_upload.sh with local-copy script
media-server/nginx.conf          # Must remove s3 exec_push; use local HLS path
.env.prod                        # Production secrets (gitignored)
scripts/migrate.sh               # One-shot migration script, separate from API start
```

### Files to **Modify** (already exist, need changes)

```
docker-compose.yml               # Optionally remove dev defaults; low priority
server/src/api-server.ts         # Remove or gate the Cloudinary upload path
server/src/config.ts             # Add VOD_BASE_URL, LOCAL_HLS_DIR env vars
server/src/routes/streams.ts     # Change VOD URL construction from S3 key → local path
server/prisma/schema.prisma      # Confirm vodUrl field stores relative local path
client/nginx.conf (or Dockerfile)# Serve /hls static files if client serves them
```

### Files to **Verify as-is** (likely fine, confirm before assuming)

```
server/src/lib/redis.ts          # Confirm it reads REDIS_URL from env (not hardcoded)
server/src/lib/prisma.ts         # Confirm it reads DATABASE_URL from env
sandbox/src/runner.ts            # Understand how Docker-in-Docker containers are named
sandbox/src/preflight.ts         # Understand static analysis rules
.github/workflows/               # CI workflows — not needed for self-hosted deploy
```

---

## 3. ARM64 Compatibility Issues

The Oracle Always Free ARM64 instance (Ampere A1) runs `aarch64` / `arm64`. Docker images must have an `arm64` variant, or be built from source for that platform.

### 3.1 nginx-rtmp-module (highest risk)

The `media-server/` directory builds a custom Docker image. Based on the docker-compose.yml which mounts `./media-server/nginx.conf` and exposes ports 1935 (RTMP) and 8080 (HTTP/HLS), the Dockerfile almost certainly uses one of these patterns:

**Pattern A** — `FROM alfg/nginx-rtmp` or `FROM tiangolo/nginx-rtmp`\
These are **x86-only** images. They will fail silently on ARM64 with the wrong binary format or won't pull at all.

**Pattern B** — `FROM ubuntu/debian + apt install nginx-rtmp-module`\
This works on ARM64 because Ubuntu/Debian ARM packages include `libnginx-mod-rtmp`. `apt install nginx libnginx-mod-rtmp` is the safe path.

**What to do:** Rewrite `media-server/Dockerfile` to build from source using the ARM64-compatible approach:

```dockerfile
# media-server/Dockerfile — ARM64 safe
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx \
      libnginx-mod-rtmp \
      ffmpeg \
      curl \
      bash \
 && rm -rf /var/lib/apt/lists/*

# Create HLS output directory
RUN mkdir -p /var/hls

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 1935 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

**Why `libnginx-mod-rtmp` instead of compiling nginx-rtmp-module:**\
Compiling nginx with nginx-rtmp-module from source requires matching nginx source version, build tools (\~600 MB), and ARM-specific compile flags. The Debian package is pre-built, tested, and installs in seconds. It is available in `debian:bookworm-slim` and `ubuntu:22.04` for `arm64`.

**Verify ARM64 availability:**

```bash
# On the VM, before deploying:
docker run --rm --platform linux/arm64 debian:bookworm-slim \
  apt-cache show libnginx-mod-rtmp
```

### 3.2 FFmpeg on ARM64

FFmpeg is available as `ffmpeg` via `apt` on Debian/Ubuntu ARM64. The package includes `libavcodec`, `libavformat`, `libx264`, and H.264 encoding — everything needed for HLS transcoding.

**Known limitation:** Hardware-accelerated encoding (`nvenc`, `vaapi`) is **not** available on Oracle ARM VMs. All FFmpeg transcoding will be software (`libx264`). On a 4-core Ampere A1, expect:

- 720p30 transcoding: \~1–2 real-time factor (barely keeps up with one stream)
- 1080p30 transcoding: will likely drop frames

**Mitigation:** The `nginx.conf` should pass the RTMP stream through to HLS without re-encoding (`exec_push` without `-vf` scaling), letting the broadcaster's client handle encoding quality. This is the correct pattern for an MVP.

### 3.3 PostgreSQL, Redis, Node.js

All three have official multi-arch images including `arm64`:

- `postgres:16-alpine` — ✓ ARM64
- `redis:7-alpine` — ✓ ARM64
- `node:20-alpine` — ✓ ARM64

No changes needed for these.

### 3.4 Sandbox isolation containers

The sandbox spawns Docker containers via the mounted Docker socket. Any container it launches must also be an ARM64 image. If `sandbox/src/runner.ts` uses `node:20-alpine` or `python:3.11-slim` as the execution container, those are fine. If it uses a custom x86 image, those containers will fail to start on ARM64.

**Action:** Inspect `sandbox/src/runner.ts` and confirm the `image:` used in `dockerode` or `child_process` calls. Replace any x86-only images with their `arm64`-compatible equivalents.

### 3.5 The `platform:` field in docker-compose

Add this to every service in `docker-compose.prod.yml` to prevent accidental x86 image pulls:

```yaml
platform: linux/arm64
```

This is a safety net — Docker will refuse to start a service with the wrong architecture instead of silently running under emulation (which would be extremely slow).

---

## 4. Production `docker-compose.prod.yml` Design

Below is the full proposed file. **This does not exist in the repository yet.**

```yaml
# docker-compose.prod.yml
# All services on a single private bridge network.
# Caddy is the only service with public-facing ports (80, 443, 1935).
# Internal services communicate by service name (container DNS).

name: devcast

services:

  # ── Data layer ─────────────────────────────────────────────────────────────

  postgres:
    image: postgres:16-alpine
    platform: linux/arm64
    container_name: devcast-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: devcast
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d devcast"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  redis:
    image: redis:7-alpine
    platform: linux/arm64
    container_name: devcast-redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 128mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redisdata:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Migration (runs once, exits) ───────────────────────────────────────────

  migrate:
    build:
      context: ./server
      target: runner          # use the same Dockerfile; see §2 note on multi-stage
    platform: linux/arm64
    container_name: devcast-migrate
    restart: on-failure       # retry if postgres isn't ready yet
    command: sh -c "npx prisma migrate deploy"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/devcast?schema=public
    networks:
      - internal

  # ── Application layer ──────────────────────────────────────────────────────

  api:
    build:
      context: ./server
    platform: linux/arm64
    container_name: devcast-api
    restart: unless-stopped
    command: npm run start:api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    environment:
      PORT: "3000"
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/devcast?schema=public
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      GEMINI_MODEL: ${GEMINI_MODEL:-gemini-2.0-flash}
      CORS_ORIGIN: https://${DOMAIN}
      WS_PUBLIC_URL: wss://${DOMAIN}
      SANDBOX_URL: http://sandbox:4000
      VOD_BASE_URL: https://${DOMAIN}/vod
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME:-}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY:-}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET:-}
    volumes:
      - voddata:/var/hls:ro   # read-only: media-server writes, API just serves URLs
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  ws:
    build:
      context: ./server
    platform: linux/arm64
    container_name: devcast-ws
    restart: unless-stopped
    command: npm run start:ws
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    environment:
      WS_PORT: "3001"
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/devcast?schema=public
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
      CORS_ORIGIN: https://${DOMAIN}
    networks:
      - internal

  sandbox:
    build:
      context: ./sandbox
    platform: linux/arm64
    container_name: devcast-sandbox
    restart: unless-stopped
    environment:
      PORT: "4000"
      NODE_ENV: production
    volumes:
      # Docker socket — see §8 for the security discussion and mitigation plan
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - internal
    # No port exposed to host — only reachable by api via internal network

  # ── Media layer ────────────────────────────────────────────────────────────

  rtmp:
    build:
      context: ./media-server
    platform: linux/arm64
    container_name: devcast-rtmp
    restart: unless-stopped
    environment:
      INTERNAL_API_SECRET: ${INTERNAL_API_SECRET}
      API_URL: http://api:3000/api/streams
    volumes:
      - voddata:/var/hls       # shared with api and caddy for VOD serving
      - ./media-server/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - internal
    ports:
      # RTMP is TCP; Caddy does not proxy TCP by default. Expose directly.
      # On Oracle Cloud, add an ingress rule for TCP 1935.
      - "1935:1935"

  # ── Frontend ───────────────────────────────────────────────────────────────

  client:
    build:
      context: ./client
      args:
        VITE_API_URL: https://${DOMAIN}
        VITE_WS_URL: wss://${DOMAIN}
    platform: linux/arm64
    container_name: devcast-client
    restart: unless-stopped
    networks:
      - internal
    # No port exposed — Caddy proxies to this container

  # ── Reverse proxy / TLS ────────────────────────────────────────────────────

  caddy:
    image: caddy:2-alpine
    platform: linux/arm64
    container_name: devcast-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"    # HTTP/3 QUIC
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
      - voddata:/var/hls:ro   # Caddy serves /vod/* directly as static files
    networks:
      - internal
    depends_on:
      - api
      - ws
      - client
      - rtmp

# ── Networks ────────────────────────────────────────────────────────────────

networks:
  internal:
    driver: bridge
    internal: false     # must be false for Caddy to reach the internet for ACME

# ── Volumes ─────────────────────────────────────────────────────────────────

volumes:
  pgdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/devcast/data/postgres   # explicit host path for easy backup

  redisdata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/devcast/data/redis

  voddata:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/devcast/data/hls        # HLS segments + VOD recordings

  caddy_data:
    driver: local
  caddy_config:
    driver: local
```

**Design decisions explained:**

- **`migrate` as a one-shot service** prevents `prisma migrate deploy` from running on every API restart. It exits with code 0 when done; `api` and `ws` wait for it via `service_completed_successfully`.
- **No `db:seed` in production** — seed data is for development only. Run manually once: `docker compose -f docker-compose.prod.yml exec api npm run db:seed`.
- **`voddata` volume shared across rtmp, api, caddy** — rtmp writes HLS segments, caddy serves them as static files, api constructs VOD URLs.
- **RTMP on port 1935 exposed directly** — Caddy is an HTTP/HTTPS proxy and doesn't natively proxy TCP RTMP. RTMP must be routed directly to the `rtmp` container. Add an Oracle Cloud ingress rule for TCP 1935.
- **`internal: false` on the bridge network** — necessary for Caddy to reach Let's Encrypt for ACME certificate issuance. If you set `internal: true`, Caddy cannot get a certificate.

---

## 5. Replacing S3 with Local VOD Storage

### What S3 Does Today

The `media-server/` directory contains a script (referenced in docker-compose.yml comments as `s3_upload.sh`) that:

1. Is triggered by nginx-rtmp's `exec_record_done` or `exec_push` after a stream ends
2. Uploads the recorded HLS/MP4 file to an S3 bucket
3. POSTs to `$API_URL` with the S3 object key, so the API can store the VOD URL in PostgreSQL

### The Local Replacement Strategy

Instead of uploading to S3, copy the finished recording to a local directory that Caddy serves as static files.

**Changes required:**

#### `media-server/nginx.conf` — change the `exec` directives

The current config likely has something like:

```nginx
exec_record_done /bin/bash /etc/nginx/s3_upload.sh $path $basename;
```

Replace with a local move:

```nginx
# Existing: live RTMP stream → HLS output
application live {
    live on;
    record all;
    record_path /var/hls/recordings;
    record_suffix -%Y%m%d-%H%M%S.flv;

    # Transcode to HLS
    exec ffmpeg -i rtmp://localhost/live/$name
      -c:v libx264 -preset ultrafast -tune zerolatency
      -c:a aac -ar 44100
      -f hls
      -hls_time 4
      -hls_list_size 6
      -hls_flags delete_segments+append_list
      -hls_segment_filename /var/hls/live/$name-%03d.ts
      /var/hls/live/$name.m3u8 2>>/var/log/nginx/ffmpeg.log;

    # When recording finishes, notify the API
    exec_record_done /entrypoint.sh done $basename;
}
```

#### `media-server/entrypoint.sh` — replace `s3_upload.sh`

```bash
#!/bin/bash
# entrypoint.sh — replaces s3_upload.sh
# Called by nginx after a recording finishes:
#   /entrypoint.sh done <basename_without_extension>

set -e

if [ "$1" = "done" ]; then
    BASENAME="$2"
    SRC="/var/hls/recordings/${BASENAME}.flv"
    DST="/var/hls/vod/${BASENAME}.flv"

    # Move recording to the VOD directory
    mkdir -p /var/hls/vod
    mv "$SRC" "$DST"

    # Optionally transcode FLV → HLS for VOD playback
    # ffmpeg -i "$DST" -c copy \
    #   -hls_time 6 -hls_list_size 0 \
    #   -hls_segment_filename "/var/hls/vod/${BASENAME}-%03d.ts" \
    #   "/var/hls/vod/${BASENAME}.m3u8" && rm "$DST"

    # Notify API server that VOD is ready
    VOD_PATH="vod/${BASENAME}.flv"
    curl -s -X POST "${API_URL}/vod-ready" \
      -H "Content-Type: application/json" \
      -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
      -d "{\"vodPath\": \"${VOD_PATH}\"}" \
      || echo "Warning: API notification failed for ${BASENAME}"
fi

# Start nginx (exec CMD)
exec "$@"
```

#### `server/src/routes/streams.ts` — change VOD URL construction

Currently the API likely builds S3 URLs like:

```typescript
vodUrl: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${vodKey}`
```

Change to:

```typescript
vodUrl: `${process.env.VOD_BASE_URL}/${vodPath}`
// e.g. https://your.domain.com/vod/stream-20260101-120000.flv
```

Add `VOD_BASE_URL` to `.env.prod` as `https://your-domain.com/vod`.

#### `server/src/config.ts` — add new env vars

```typescript
export const config = {
  // ... existing
  vodBaseUrl: process.env.VOD_BASE_URL || 'http://localhost:8080/vod',
  localHlsDir: process.env.LOCAL_HLS_DIR || '/var/hls',
};
```

#### Caddy — serve `/vod/*` as static files

See §6 for the Caddyfile. The relevant block:

```
handle /vod/* {
    root * /var/hls
    file_server
}
```

### Cloudinary Thumbnail Replacement

The `.env.example` marks Cloudinary as optional: "if unset, the thumbnail upload endpoint returns 503 and streams simply have no thumbnail." This means you can leave `CLOUDINARY_CLOUD_NAME` empty in `.env.prod` and thumbnails just won't work. The application does not crash.

If you want local thumbnails, the approach is: capture a frame with FFmpeg when the stream starts (`exec_push`), save it to `/var/hls/thumbs/<streamId>.jpg`, and serve via Caddy at `/thumbs/*`. This is an enhancement, not required for MVP.

---

## 6. Caddy / HTTPS / Networking Changes

### Why Caddy

- Automatic HTTPS via Let's Encrypt ACME (HTTP-01 challenge on port 80)
- Native WebSocket proxying (no extra config)
- No Lua, no SSL stanza, no certbot cron
- Small binary; official `caddy:2-alpine` image has ARM64 support

**Prerequisite:** Your domain's DNS A record must point to the Oracle VM's public IP before first start. Caddy will fail certificate issuance if DNS isn't resolving.

### Proposed `Caddyfile`

Create at the repository root as `Caddyfile`:

```caddyfile
# Caddyfile
# Replace your.domain.com with your actual domain.
# DOMAIN env var is substituted from the shell or .env.prod.

{your.domain.com} {

    # ── API (REST) ────────────────────────────────────────────────────
    handle /api/* {
        reverse_proxy api:3000 {
            health_uri /health
            health_interval 10s
        }
    }

    # ── WebSocket (Socket.IO) ─────────────────────────────────────────
    # Socket.IO uses /socket.io path by default.
    handle /socket.io/* {
        reverse_proxy ws:3001 {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
        }
    }

    # ── HLS live stream ───────────────────────────────────────────────
    # nginx-rtmp writes .m3u8 and .ts files to /var/hls/live/
    # Caddy serves them directly — avoids double-proxy through rtmp container
    handle /hls/* {
        root * /var/hls/live
        # Strip the /hls prefix before looking up files
        uri strip_prefix /hls
        file_server
        header Content-Type application/vnd.apple.mpegurl
        header Access-Control-Allow-Origin *
        header Cache-Control "no-cache, no-store"
    }

    # ── VOD recordings ────────────────────────────────────────────────
    handle /vod/* {
        root * /var/hls/vod
        uri strip_prefix /vod
        file_server
        header Access-Control-Allow-Origin *
    }

    # ── React SPA (catch-all) ─────────────────────────────────────────
    handle {
        reverse_proxy client:80
    }

    # ── Logging ───────────────────────────────────────────────────────
    log {
        output file /var/log/caddy/access.log {
            roll_size 50MB
            roll_keep 5
        }
    }
}
```

### Networking Architecture

```
Internet
   │
   ├─ TCP 443 (HTTPS) ──► caddy:443 ──► client:80          (React SPA)
   │                              ├──► api:3000            (REST /api/*)
   │                              ├──► ws:3001             (WebSocket /socket.io/*)
   │                              ├──► /var/hls (static)   (HLS + VOD files)
   │
   ├─ TCP 80 (HTTP) ────► caddy:80  ──► 301 → HTTPS (or ACME challenge)
   │
   └─ TCP 1935 (RTMP) ──► rtmp:1935 ──► nginx-rtmp (OBS connects here)

All other ports (5432, 6379, 3000, 3001, 4000, 8080) are on the internal
Docker bridge network only — not exposed to the host or internet.
```

**Port 8080 (nginx-rtmp HTTP):** In the development compose, the `rtmp` container exposes port 8080 for HLS delivery. In production, this port is **not** exposed. Caddy reads HLS files directly from the shared `voddata` volume. The nginx-rtmp container still writes to `/var/hls`, but you access HLS via Caddy at `https://your.domain.com/hls/<streamKey>.m3u8`.

**Socket.IO sticky sessions:** Socket.IO with Redis adapter (which DevCast uses via BullMQ/Redis) supports multiple WS instances. With a single `ws` container there's no load-balancing concern. If you later scale, add `lb_policy cookie_hash` to the Caddy WebSocket block.

### Oracle Cloud Network Security Lists

In the Oracle Cloud Console, add ingress rules for the VM's Security List (or Network Security Group):

| Protocol | Port | Source | Purpose |
| --- | --- | --- | --- |
| TCP | 22 | your IP only | SSH |
| TCP | 80 | 0.0.0.0/0 | Caddy ACME + HTTP redirect |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 1935 | 0.0.0.0/0 | RTMP ingest (OBS) |

**Do not open** ports 5432, 6379, 3000, 3001, 4000, or 8080 in the security list. They must stay internal.

Also update the VM's OS-level firewall:

```bash
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 1935 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

Oracle's default Ubuntu image ships with iptables rules that block these ports at the OS level even if the security list allows them.

---

## 7. Production Environment Variables & Secrets

Create `.env.prod` at the repository root (add to `.gitignore` immediately).

```bash
# .env.prod — NEVER COMMIT THIS FILE

# ── Domain ──────────────────────────────────────────────────────────
DOMAIN=your.domain.com

# ── Database ─────────────────────────────────────────────────────────
POSTGRES_USER=devcast
POSTGRES_PASSWORD=<generate: openssl rand -hex 24>

# ── Redis ─────────────────────────────────────────────────────────────
REDIS_PASSWORD=<generate: openssl rand -hex 24>

# ── Auth ──────────────────────────────────────────────────────────────
JWT_SECRET=<generate: openssl rand -hex 32>
INTERNAL_API_SECRET=<generate: openssl rand -hex 32>

# ── AI ────────────────────────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash

# ── Media / VOD ───────────────────────────────────────────────────────
VOD_BASE_URL=https://your.domain.com/vod

# ── Cloudinary (optional — leave empty to disable thumbnails) ─────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Generate secrets on the VM:**

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "INTERNAL_API_SECRET=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
echo "REDIS_PASSWORD=$(openssl rand -hex 24)"
```

**File permissions:**

```bash
chmod 600 .env.prod
# Only root and the deploy user should read it
```

**How compose reads it:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

**What must change in `server/src/config.ts`:**\
The server's production fail-fast check (`INTERNAL_API_SECRET` must not be the dev default) already exists. Setting `NODE_ENV=production` in the compose enables it. Confirm `REDIS_URL` is constructed with the password:

```
REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

The colon before the password is required — Redis ACL format is `redis://:password@host:port`.

---

## 8. Security Issues

### 8.1 Docker Socket in Sandbox (Critical)

**Current state:** `sandbox` mounts `/var/run/docker.sock:/var/run/docker.sock`. This gives the sandbox container — and any code it executes — complete control over the Docker daemon. A submitted program that calls `docker run --rm -v /:/host alpine chroot /host` would own the host.

The README acknowledges this: "Docker container sandbox isolation" is listed as a Phase 2 item not yet built. The current sandbox uses the Docker socket to spawn containers for code isolation, but the isolation itself is not hardened.

**Mitigation options (in order of effort):**

| Option | Effort | Protection |
| --- | --- | --- |
| **A. Restrict socket with `socat` proxy** that only allows `POST /containers/create` with a whitelist of images | Medium | Moderate — limits which images can be spawned |
| **B. Replace Docker socket with `gVisor` (runsc)** as the container runtime | High | Strong — kernel syscall interception |
| **C. Rate-limit submissions at the API level** (already in place per README) | None | Weak — reduces attack surface but doesn't sandbox |
| **D. Run sandbox on a separate VM (not Oracle Free Tier)** | Medium | Complete isolation |

**Minimum viable mitigation for MVP:** Keep the existing socket mount but add these constraints to `docker-compose.prod.yml`:

```yaml
sandbox:
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  read_only: true
  tmpfs:
    - /tmp:size=64m,noexec
```

This hardens the sandbox container itself, but does not prevent the Docker socket from being exploited. Accept this as a known risk for a portfolio/demo deployment.

### 8.2 Redis Without Password (Development Compose)

The existing `docker-compose.yml` runs Redis with no password. In production, Redis stores BullMQ job queues (AI hint jobs) and Socket.IO session state. With a password + the internal bridge network (not host-exposed), this is adequately protected.

The proposed compose adds `--requirepass ${REDIS_PASSWORD}` and `REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379`.

**Confirm:** `server/src/lib/redis.ts` reads `REDIS_URL` from environment and passes it to `ioredis` or BullMQ's `connection` option. If it constructs the URL manually without a password, it will need to be updated to use the full URL.

### 8.3 INTERNAL_API_SECRET Exposure

The `INTERNAL_API_SECRET` appears in the `rtmp` container to authenticate the `s3_upload.sh` (or replacement `entrypoint.sh`) callback to the API server. In production, this secret must:

1. Not be the dev default string `dev-internal-secret-change-me`
2. Be a random 256-bit hex string
3. Be validated by the API on every internal request (appears to already be implemented per the README's fail-fast check)

### 8.4 JWT Secrets and Token Expiry

`.env.example` shows `JWT_EXPIRES_IN=15m` and `REFRESH_TOKEN_EXPIRES_IN=7d`. These are reasonable defaults. Keep them in production.

### 8.5 CORS Origin

The development compose sets `CORS_ORIGIN=http://localhost`. In production set it to `https://your.domain.com`. The API server should not accept `*` as `CORS_ORIGIN` — it currently enforces this via the `config.ts` fail-fast.

### 8.6 Caddy Admin API

By default Caddy exposes an admin REST API on `localhost:2019`. This is not accessible from outside the container, but if you need to disable it:

```caddyfile
{
    admin off
}
```

---

## 9. Oracle VM Deployment Steps

These are ordered steps. Each step builds on the previous. Do not skip steps.

### Step 1 — Provision the VM

1. Log in to Oracle Cloud Console → Compute → Instances → Create Instance
2. Choose **Ampere A1 Flex** shape: 4 OCPUs, 24 GB RAM (Always Free allocation)
3. Select **Ubuntu 22.04 LTS (aarch64)**
4. Add your SSH public key
5. VCN: create or reuse; ensure ports 22, 80, 443, 1935 are in the Security List ingress rules

### Step 2 — Initial VM Setup

```bash
# SSH in
ssh ubuntu@<vm-public-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (official method for Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Verify ARM64
docker info | grep Architecture
# Expected: Architecture: aarch64

# Install iptables-persistent for firewall rules
sudo apt install -y iptables-persistent

# Open required ports
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 1935 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Step 3 — Create Persistent Data Directories

```bash
sudo mkdir -p /opt/devcast/data/postgres
sudo mkdir -p /opt/devcast/data/redis
sudo mkdir -p /opt/devcast/data/hls/live
sudo mkdir -p /opt/devcast/data/hls/vod
sudo mkdir -p /opt/devcast/data/hls/recordings

# Give the ubuntu user ownership
sudo chown -R ubuntu:ubuntu /opt/devcast/data

# postgres requires specific permissions
sudo chown -R 999:999 /opt/devcast/data/postgres
# 999 is the postgres user UID inside the container
```

### Step 4 — Clone Repository and Configure

```bash
# Clone (or rsync from your dev machine)
git clone https://github.com/purvil3105/DevCast.git /opt/devcast/app
cd /opt/devcast/app

# Create production env file
nano .env.prod
# (Paste the .env.prod content from §7, fill in all values)
chmod 600 .env.prod

# Verify .env.prod is in .gitignore
grep '.env.prod' .gitignore || echo '.env.prod' >> .gitignore
```

### Step 5 — Point DNS

Go to your domain registrar (or Cloudflare, etc.) and create an A record:

```
your.domain.com  →  <oracle-vm-public-ip>
```

Wait for propagation:

```bash
dig +short your.domain.com
# Should return your VM's IP
```

Do not proceed to the next step until DNS resolves correctly. Caddy will fail to get a certificate otherwise.

### Step 6 — Write New Files

Create all files described in §2 that don't exist yet:

- `media-server/Dockerfile` (ARM64 version from §3.1)
- `media-server/entrypoint.sh` (from §5)
- Updated `media-server/nginx.conf` (from §5)
- `Caddyfile` (from §6)
- `docker-compose.prod.yml` (from §4)

Apply the code changes to `server/src/routes/streams.ts` and `server/src/config.ts` described in §5.

### Step 7 — Build Images

```bash
cd /opt/devcast/app

# Build all images without starting containers
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# This will take 5–15 minutes on first run (compiling TypeScript, npm install)
# Subsequent builds are much faster due to layer caching
```

### Step 8 — Run Database Migration

```bash
# Start only postgres and redis first
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  up -d postgres redis

# Wait for postgres to be healthy
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  ps postgres
# Status should show "(healthy)"

# Run migration once
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm migrate

# Seed demo data (optional, once only)
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  exec api npm run db:seed
```

### Step 9 — Start All Services

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Watch startup logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f

# Check all containers are running
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

### Step 10 — Verify Certificate

```bash
# Caddy logs will show certificate acquisition
docker logs devcast-caddy | grep -i "certificate\|acme\|tls"

# Test HTTPS
curl -I https://your.domain.com
# Should return HTTP/2 200 or 301
```

---

## 10. End-to-End Verification Checklist

Run these checks after deployment. Each test is self-contained.

### Database

```bash
# Connect directly to postgres
docker exec -it devcast-postgres psql -U ${POSTGRES_USER} -d devcast \
  -c "SELECT COUNT(*) FROM users;"
# Should return a number (0 if not seeded, 2+ if seeded)
```

### Redis

```bash
# Ping redis with password
docker exec -it devcast-redis redis-cli -a ${REDIS_PASSWORD} ping
# Expected: PONG

# Check BullMQ queues exist after API starts
docker exec -it devcast-redis redis-cli -a ${REDIS_PASSWORD} \
  KEYS "bull:*"
```

### API Health

```bash
curl https://your.domain.com/api/health
# Expected: {"status":"ok"} or similar
```

### Auth Flow

```bash
# Register
curl -X POST https://your.domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@devcast.io","password":"password123"}'
# Expected: JSON with access_token
```

### WebSocket

Open browser DevTools → Network → WS filter, navigate to `https://your.domain.com`. The Socket.IO connection should appear with status 101 (Switching Protocols). Alternatively:

```bash
# Using wscat (install: npm i -g wscat)
wscat -c "wss://your.domain.com/socket.io/?EIO=4&transport=websocket"
# Expected: 0{...} (Socket.IO handshake)
```

### Sandbox

```bash
# Submit a code execution request via the API
TOKEN="your-jwt-token-here"
curl -X POST https://your.domain.com/api/submissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(1+1)","language":"javascript","challengeId":"..."}'
# Expected: {"output":"2","passed":true}
```

### RTMP Ingest

In OBS Studio:

- Settings → Stream → Service: Custom
- Server: `rtmp://your.domain.com/live`
- Stream Key: any key (e.g., `test`)
- Click "Start Streaming"

Verify on the VM:

```bash
# RTMP connections appear in nginx logs
docker logs devcast-rtmp 2>&1 | tail -20

# HLS files appear within a few seconds
ls -la /opt/devcast/data/hls/live/
# Should show test.m3u8 and test-001.ts etc.
```

### FFmpeg / HLS

```bash
# Pull the M3U8 playlist
curl https://your.domain.com/hls/test.m3u8
# Expected: #EXTM3U playlist content

# Fetch a segment
curl -I https://your.domain.com/hls/test-001.ts
# Expected: HTTP/2 200, Content-Type: video/MP2T
```

### HLS Playback in Browser

```bash
# Open this URL in VLC or any HLS-capable player:
open "https://your.domain.com/hls/test.m3u8"

# Or use ffplay on the VM itself:
docker exec -it devcast-rtmp \
  ffplay -i rtmp://localhost/live/test
```

### VOD (after stream ends)

```bash
# After stopping the OBS stream, check VOD directory
ls -la /opt/devcast/data/hls/vod/

# The API should have been notified; check the stream record
curl -H "Authorization: Bearer $TOKEN" \
  https://your.domain.com/api/streams/<stream-id>
# Expected: vodUrl field populated
```

### HTTPS Certificate

```bash
# Check certificate validity
openssl s_client -connect your.domain.com:443 -servername your.domain.com \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
# notBefore and notAfter should be valid; issuer should be Let's Encrypt
```

### Full Flow (Browser)

1. Open `https://your.domain.com`
2. Login as instructor → create/enter a stream → click "Go Live"
3. In OBS: stream to `rtmp://your.domain.com/live/<stream-key>`
4. Refresh the instructor page — video player should show the HLS stream
5. Open incognito → login as viewer → join the same stream → video should play
6. As instructor: trigger a challenge
7. As viewer: submit code → see test results → see AI hint (requires Gemini key)
8. As instructor: end the stream → VOD URL should appear on stream detail page

---

## 11. Resource & Performance Risks on a Small ARM VM

Oracle Free Tier ARM (Ampere A1 Flex, Always Free): 4 OCPUs, 24 GB RAM, 200 GB block storage, 10 TB/month egress.

### Memory Budget

| Service | Expected RSS | Notes |
| --- | --- | --- |
| postgres | 200–400 MB | Shared buffers, default config |
| redis | 150–200 MB | 128 MB data + process overhead |
| api (Node.js) | 150–300 MB | Express + Prisma connection pool |
| ws (Node.js) | 100–200 MB | Socket.IO + Redis adapter |
| sandbox (Node.js) | 80–150 MB | Express only |
| rtmp (nginx) | 50–100 MB | nginx worker processes |
| client (nginx) | 20–50 MB | Serving static files |
| caddy | 30–80 MB | Go runtime |
| Execution containers | 100–300 MB each | Docker sandbox containers, temporary |
| **Total baseline** | **\~1.0–1.8 GB** | Without active streams or submissions |

The 24 GB RAM makes this comfortable. Even with 10 concurrent code submissions spawning Docker containers, you're well within limits.

### CPU Budget

| Workload | CPU Impact |
| --- | --- |
| 1 RTMP stream with FFmpeg HLS transcoding | \~1.5–2 cores |
| 10 concurrent code submission containers | \~0.5–1 core burst |
| BullMQ AI hint jobs (Gemini API I/O bound) | \~0.1 core |
| Postgres + Redis steady state | \~0.1 core |
| **Peak estimate (1 stream + 10 submissions)** | **\~2.5–3.5 cores** |

4 cores is sufficient for demo/portfolio load. The main risk is FFmpeg transcoding at high resolution. If the broadcaster streams at 1080p60, FFmpeg will use \~3 cores alone with software encoding.

**Mitigation:** Set OBS output to 720p30, bitrate 2500 kbps. Add to the nginx.conf FFmpeg invocation: `-s 1280x720 -r 30`.

### Disk I/O

HLS segments are written continuously while streaming. A 2500 kbps stream generates \~1 GB per hour of segments (with `hls_list_size 6`, only \~24 seconds of live segments are kept). VOD recordings accumulate. Set up a cron job:

```bash
# Delete VOD files older than 30 days
0 3 * * * find /opt/devcast/data/hls/vod -mtime +30 -delete
```

### Swap

Add swap to prevent OOM kills during build or peak usage:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Network Egress

Oracle provides 10 TB/month free. A 2500 kbps stream with 5 viewers consumes:

- 2500 kbps × 5 viewers × 3600 s = \~5.4 GB per streaming hour

You'd need \~1850 hours of 5-viewer streaming to hit the egress cap. No risk for a portfolio project.

### Reliability Risk: Single VM

Everything runs on one VM. A crash, reboot, or OOM kill takes everything down simultaneously. Mitigations:

- `restart: unless-stopped` on all services (already in proposed compose)
- Postgres and Redis data on named volumes with explicit host paths (easy to restore)
- Docker's built-in healthcheck + restart policy handles process-level failures

---

## 12. Final Ordered Checklist of Changes

Changes are ordered: complete each before starting the next. Items marked `[NEW FILE]` must be created from scratch; `[MODIFY]` means edit an existing file.

### Phase 1 — Code Changes (do on your dev machine, before touching the VM)

- [ ] **\[MODIFY\]** `media-server/Dockerfile` — rewrite for ARM64 using `debian:bookworm-slim` + `apt install nginx libnginx-mod-rtmp ffmpeg`
- [ ] **\[NEW FILE\]** `media-server/entrypoint.sh` — local VOD notification script, replaces `s3_upload.sh` logic
- [ ] **\[MODIFY\]** `media-server/nginx.conf` — remove S3 `exec_push`; add FFmpeg HLS transcode exec and local VOD path; write segments to `/var/hls/live/`; write recordings to `/var/hls/recordings/`; trigger `entrypoint.sh done` on `exec_record_done`
- [ ] **\[MODIFY\]** `server/src/config.ts` — add `VOD_BASE_URL` and `LOCAL_HLS_DIR` from environment
- [ ] **\[MODIFY\]** `server/src/routes/streams.ts` — change VOD URL construction to use `config.vodBaseUrl + "/" + vodPath` instead of S3 key
- [ ] **\[VERIFY\]** `server/src/lib/redis.ts` — confirm it reads `REDIS_URL` from `process.env` and passes it to ioredis/BullMQ verbatim (password in URL works)
- [ ] **\[VERIFY\]** `sandbox/src/runner.ts` — confirm all Docker image names are multi-arch (arm64-compatible); replace any x86-only images
- [ ] **\[MODIFY\]** `server/package.json` — ensure `start:api` and `start:ws` scripts do **not** run migrations or seeds; migration must be a separate script
- [ ] **\[NEW FILE\]** `docker-compose.prod.yml` — full production compose as described in §4
- [ ] **\[NEW FILE\]** `Caddyfile` — as described in §6
- [ ] **\[NEW FILE\]** `.env.prod` (gitignored) — production secrets template as described in §7
- [ ] **\[MODIFY\]** `.gitignore` — add `.env.prod` if not already present

### Phase 2 — VM Setup (on Oracle Cloud)

- [ ] Provision ARM64 VM (4 OCPU, 24 GB RAM, Ubuntu 22.04 aarch64)
- [ ] Add Oracle security list ingress rules: TCP 22 (your IP), 80, 443, 1935 (all)
- [ ] SSH in; run `apt update && apt upgrade -y`
- [ ] Install Docker via `get.docker.com` script; verify `Architecture: aarch64`
- [ ] Configure OS firewall (`iptables`) for ports 80, 443, 1935
- [ ] Create `/opt/devcast/data/{postgres,redis,hls/live,hls/vod,hls/recordings}` with correct ownership
- [ ] Add 4 GB swapfile
- [ ] Set up log rotation cron for VOD files

### Phase 3 — Deploy

- [ ] Clone repo to `/opt/devcast/app`
- [ ] Write `.env.prod` with generated secrets
- [ ] Point DNS A record → VM public IP; confirm with `dig`
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.prod build`
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d postgres redis`
- [ ] Wait for postgres healthy; run `docker compose ... run --rm migrate`
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`
- [ ] Watch `docker logs devcast-caddy` for TLS certificate acquisition

### Phase 4 — Verify

Run every check in §10 in order:

- [ ] Database: `psql -c "SELECT COUNT(*) FROM users;"`
- [ ] Redis: `redis-cli ping`
- [ ] API health: `curl https://domain/api/health`
- [ ] Auth: login as instructor, get JWT
- [ ] WebSocket: connect via browser DevTools or wscat
- [ ] Sandbox: submit code execution; verify output
- [ ] RTMP: stream from OBS; verify connection in rtmp logs
- [ ] FFmpeg/HLS: `ls /opt/devcast/data/hls/live/` shows segments
- [ ] HLS playlist: `curl https://domain/hls/<key>.m3u8`
- [ ] Browser HLS: video plays in the React client
- [ ] VOD: stop stream; verify VOD file appears; verify vodUrl in API response
- [ ] HTTPS: openssl check shows valid Let's Encrypt cert
- [ ] Full flow: instructor + viewer end-to-end with challenge and code submission

---

*Plan version: 2026-09-24. Based on repository state at time of inspection.*\
*Review all `[VERIFY]` items against actual source files before implementing.*
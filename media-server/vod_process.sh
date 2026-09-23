#!/bin/bash
# vod_process.sh — Triggered by nginx-rtmp exec_record_done
# Arguments: $1 = path to recorded flv file, $2 = streamName (streamKey)

set -e

FLV_PATH="$1"
STREAM_KEY="$2"

if [ -z "$FLV_PATH" ] || [ -z "$STREAM_KEY" ]; then
    echo "Usage: $0 <flv_path> <stream_key>" >&2
    exit 1
fi

LOG_FILE="/var/log/nginx/vod.log"
mkdir -p /var/log/nginx
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting local VOD processing for streamKey: $STREAM_KEY from $FLV_PATH" >> "$LOG_FILE"

VOD_DIR="/var/hls/vod/${STREAM_KEY}"
mkdir -p "$VOD_DIR"

API_URL="${API_URL:-http://api:3000/api/streams}"
VOD_BASE_URL="${VOD_BASE_URL:-http://localhost:8080/vod}"
INTERNAL_SECRET="${INTERNAL_API_SECRET:-dev-internal-secret-change-me}"

# 1. Transcode FLV to HLS VOD (720p 30fps)
if [ -f "$FLV_PATH" ]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Transcoding FLV to HLS VOD in $VOD_DIR..." >> "$LOG_FILE"
    ffmpeg -y -i "$FLV_PATH" \
      -c:v libx264 -b:v 2200k -pix_fmt yuv420p \
      -s 1280x720 -preset superfast -profile:v baseline \
      -c:a aac -b:a 128k -ar 44100 \
      -g 60 -hls_time 4 -hls_playlist_type vod \
      -hls_segment_filename "$VOD_DIR/%03d.ts" \
      "$VOD_DIR/index.m3u8" >> "$LOG_FILE" 2>&1

    # 2. Notify DevCast API server that VOD is ready
    FINAL_VOD_URL="${VOD_BASE_URL}/${STREAM_KEY}/index.m3u8"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Notifying API at $API_URL/by-key/$STREAM_KEY/vod-ready with URL: $FINAL_VOD_URL" >> "$LOG_FILE"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/by-key/$STREAM_KEY/vod-ready" \
      -H "Content-Type: application/json" \
      -H "X-Internal-Secret: $INTERNAL_SECRET" \
      -d "{\"vodUrl\":\"$FINAL_VOD_URL\"}" || true)

    HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] API response code: $HTTP_STATUS" >> "$LOG_FILE"

    # 3. Clean up the source recording to save disk space
    rm -f "$FLV_PATH"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Cleaned up raw recording: $FLV_PATH" >> "$LOG_FILE"
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Recording file $FLV_PATH not found, skipping." >> "$LOG_FILE"
fi

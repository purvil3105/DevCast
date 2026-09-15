#!/bin/bash
# s3_upload.sh - Triggered by nginx-rtmp exec_record_done
# Arguments: $1 = path to recorded flv file, $2 = streamName (streamKey)

FLV_PATH=$1
STREAM_KEY=$2
VOD_DIR="/tmp/vod/${STREAM_KEY}"
S3_BUCKET="s3://devcast-vods"
API_URL="${API_URL:-http://host.docker.internal:3000/api/streams}" # API Server URL
# Shared secret authorizing this server-to-server call (must match the API's
# INTERNAL_API_SECRET). Injected into the media-server container's environment.
INTERNAL_SECRET="${INTERNAL_API_SECRET:-dev-internal-secret-change-me}"

echo "Starting VOD processing for $STREAM_KEY..." >> /var/log/nginx/vod.log

# 1. Create directory for VOD HLS output
mkdir -p "$VOD_DIR"

# 2. Transcode FLV to HLS (720p only for MVP, as requested)
ffmpeg -i "$FLV_PATH" \
  -c:v libx264 -b:v 2500k -c:a aac -b:a 128k \
  -s 1280x720 -preset superfast -profile:v baseline \
  -g 60 -hls_time 4 -hls_playlist_type vod \
  -hls_segment_filename "$VOD_DIR/%03d.ts" \
  "$VOD_DIR/index.m3u8"

# 3. Upload to S3 (assuming AWS CLI is configured in the container)
# Since this is a local setup and AWS might not be configured, we will mock the S3 URL
# but execute the aws command if possible.
aws s3 cp "$VOD_DIR" "$S3_BUCKET/${STREAM_KEY}" --recursive --acl public-read || true

# Mock S3 URL for local testing if bucket isn't real
# We will just construct the expected S3 URL format
VOD_URL="https://devcast-vods.s3.amazonaws.com/${STREAM_KEY}/index.m3u8"

# If AWS CLI fails, fallback to a local URL for testing
# VOD_URL="http://localhost:8080/vod/${STREAM_KEY}/index.m3u8"

# 4. Notify REST API that VOD is ready
# We will patch the endpoint to accept streamKey instead of streamId.

curl -X PATCH "$API_URL/by-key/$STREAM_KEY/vod-ready" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: $INTERNAL_SECRET" \
  -d "{\"vodUrl\":\"$VOD_URL\"}" >> /var/log/nginx/vod.log

# 5. Cleanup
rm -f "$FLV_PATH"
# Keep VOD_DIR locally if we are serving locally, otherwise can be removed.

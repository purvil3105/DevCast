# media-server/Dockerfile
# Multi-arch compatible (linux/amd64 and linux/arm64) for Debian Bookworm
FROM debian:bookworm-slim

# Install Nginx with RTMP module, FFmpeg, curl and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    libnginx-mod-rtmp \
    ffmpeg \
    curl \
    bash \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Create directory tree for HLS fragments, VOD storage, raw recordings, and logs
RUN mkdir -p /var/hls/live /var/hls/vod /var/hls/recordings /var/log/nginx /tmp/hls /tmp/recordings

# Copy custom Nginx configuration and VOD processing script
COPY nginx.conf /etc/nginx/nginx.conf
COPY vod_process.sh /etc/nginx/vod_process.sh
RUN chmod +x /etc/nginx/vod_process.sh

EXPOSE 1935 8080

CMD ["nginx", "-g", "daemon off;"]

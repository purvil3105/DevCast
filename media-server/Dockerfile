FROM tiangolo/nginx-rtmp

# Install FFmpeg for real-time video transcoding (Debian base)
RUN apt-get update && apt-get install -y ffmpeg curl awscli && rm -rf /var/lib/apt/lists/*

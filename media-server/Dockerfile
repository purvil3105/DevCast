FROM tiangolo/nginx-rtmp

# Install FFmpeg for real-time video transcoding (Debian base)
RUN echo "deb http://archive.debian.org/debian bullseye main" > /etc/apt/sources.list && \
    apt-get clean && apt-get update -o Acquire::Check-Valid-Until=false && \
    apt-get install -y ffmpeg curl awscli && \
    rm -rf /var/lib/apt/lists/*

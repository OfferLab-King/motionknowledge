FROM node:24-alpine

# Specialist render container for MotionKnowledge HyperFrames scenes.
# Build-time network is required to install the headless browser and FFmpeg;
# the runtime sandbox provides --network=none --read-only and resource caps.
RUN apk add --no-cache chromium ffmpeg

WORKDIR /render

# Entry point: deterministic frame-by-frame rendering from frozen input assets.
COPY render-entrypoint.sh /render/entrypoint.sh
RUN chmod +x /render/entrypoint.sh && \
    adduser -D -u 9999 renderer && mkdir -p /render/out && chown renderer /render/out

USER renderer
ENTRYPOINT ["/render/entrypoint.sh"]

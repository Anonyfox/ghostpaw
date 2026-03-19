FROM node:24-slim

LABEL org.opencontainers.image.source="https://github.com/Anonyfox/ghostpaw"
LABEL org.opencontainers.image.description="Single-file AI agent runtime"
LABEL org.opencontainers.image.licenses="MIT"

COPY dist/ghostpaw.mjs /usr/local/bin/ghostpaw

RUN chmod +x /usr/local/bin/ghostpaw

WORKDIR /workspace

ENTRYPOINT ["ghostpaw"]

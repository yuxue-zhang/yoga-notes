FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/yoga
COPY app/ ./app/
COPY deploy/railway/ ./deploy/railway/
ENV NODE_ENV=production YOGA_FFMPEG=/usr/bin/ffmpeg
EXPOSE 8787
CMD ["node", "deploy/railway/gateway.mjs"]

# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/ingest ./apps/ingest
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @studio-os/shared build \
  && pnpm --filter @studio-os/ingest prisma:generate \
  && pnpm --filter @studio-os/ingest build

FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
WORKDIR /app/apps/ingest
CMD ["node", "dist/index.js"]

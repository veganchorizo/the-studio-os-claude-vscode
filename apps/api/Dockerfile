# syntax=docker/dockerfile:1
# ---- Base: pnpm + Node 20 -------------------------------------------------
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# ---- Build: install workspace, generate Prisma client, compile TS ---------
FROM base AS build
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @studio-os/shared build \
  && pnpm --filter @studio-os/api prisma:generate \
  && pnpm --filter @studio-os/api build

# ---- Runtime --------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# openssl is required by the Prisma query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:3000/health || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

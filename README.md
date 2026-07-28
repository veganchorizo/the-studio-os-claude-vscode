# The Studio OS

An **offline, local-first AI operating system for professional recording studios.**

Not a ChatGPT wrapper — a studio command center. Everything runs inside Docker
on your own hardware. No cloud services, no telemetry, no analytics, no external
API calls. The only network traffic is between containers on an internal Docker
network. It works with the internet disconnected.

> Status: **working foundation.** The full Docker stack, database schema, local
> auth, hybrid-search RAG pipeline, and the **Sessions** and **Equipment**
> modules are implemented end-to-end. Every other module has a typed backend
> API, database model, and plugin extension points, with UI layered in
> incrementally. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

```bash
cp .env.example .env
# edit .env: set SESSION_SECRET, POSTGRES_PASSWORD, ADMIN_PASSWORD

docker compose up -d
```

Then open <http://localhost:8080> and sign in with the admin account from `.env`.

Pull local models into the Ollama volume (one-time, requires connectivity *once*
or a pre-seeded volume — see [offline install](docs/INSTALL_OFFLINE.md)):

```bash
docker exec -it studio-os-ollama ollama pull llama3.1:8b
docker exec -it studio-os-ollama ollama pull nomic-embed-text
```

Drop documents into the ingest volume to index them:

```bash
docker cp ./my-manuals/. studio-os-ingest:/data/watch/
```

## Architecture at a glance

| Container            | Role                                                      |
| -------------------- | --------------------------------------------------------- |
| `studio-os-web`      | React SPA (Vite + Tailwind + shadcn-style UI), nginx      |
| `studio-os-api`      | Fastify + Prisma API, auth, RAG chat, hybrid search       |
| `studio-os-db`       | Postgres 16 + pgvector + pg_trgm                          |
| `studio-os-ollama`   | Local LLM + embedding inference                           |
| `studio-os-worker`   | Parse → chunk → embed pipeline, predictive maintenance    |
| `studio-os-ingest`   | Watch-folder document ingestion + versioning              |
| `studio-os-backups`  | Scheduled `pg_dump` with retention                        |
| `studio-os-nginx`    | Optional single-origin reverse proxy (`--profile proxy`)  |

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn-style UI, TanStack Query, Zustand, React Router
- **Backend:** Fastify, TypeScript, Prisma, PostgreSQL, pgvector
- **AI:** Ollama (any GGUF / llama.cpp-compatible model), local embeddings, hybrid RAG
- **Search:** pgvector cosine similarity + Postgres full-text, fused with RRF
- **Infra:** Docker Compose, multi-stage Dockerfiles, named volumes, health checks

## Repository layout

```
studio-os/
├── apps/
│   ├── api/      Fastify API, Prisma schema, modules, tests
│   ├── web/      React SPA
│   ├── worker/   Ingestion + embedding worker
│   └── ingest/   Watch-folder file registrar
├── packages/
│   └── shared/   Typed API contracts (zod) shared by api + web
├── docker/       db init, nginx, backups
├── docs/         install, architecture, plugins, roadmap
└── docker-compose.yml
```

## Development

```bash
pnpm install
pnpm --filter @studio-os/shared build
pnpm dev                # runs all apps in watch mode
pnpm test               # unit + integration tests
pnpm --filter @studio-os/web test:e2e   # Playwright e2e (needs a running stack)
```

Or in containers with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Security & privacy

- Passwords hashed with bcrypt; sessions are server-side rows behind signed HTTP-only cookies.
- Strict Content Security Policy (`connect-src 'self'`) — the browser cannot reach the internet.
- Role-based access control (ADMIN / ENGINEER / MANAGER / INTERN / VIEWER).
- Append-only audit log for sensitive actions.
- Automatic, retained database backups.

## License

AGPL-3.0-or-later.

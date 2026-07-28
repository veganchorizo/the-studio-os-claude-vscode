# Architecture

## Principles

1. **Local-first / offline.** No component makes outbound internet requests.
   The browser's CSP `connect-src` is `'self'`; the API talks only to Postgres
   and the in-network Ollama service.
2. **Typed contracts everywhere.** `packages/shared` holds zod schemas that are
   the single source of truth for request/response shapes. The API validates
   with them; the web imports the inferred TypeScript types.
3. **Feature-based modules.** Each API module (`src/modules/<feature>`) owns its
   routes and service. Flagship modules have bespoke services; secondary modules
   share a generic CRUD factory (`lib/crud.ts`).
4. **Extensible.** A local plugin system (`src/plugin-system`) lets plugins add
   routes, agents, importers/exporters, commands, and automations — all in-process.

## Data flow: document ingestion & RAG

```
        drop file                      poll PENDING
 user ───────────▶ /data/watch ──▶ studio-os-ingest ──▶ Document(PENDING)
                                        │  (checksum, version, archive original)
                                        ▼
                                  studio-os-worker
                    parse → chunk → embed (Ollama) → DocumentChunk(+vector)
                                        │
                                        ▼
                                Document(INDEXED)

 user asks AI ─▶ /api/ai/chat ─▶ retrieve() ─▶ hybrid search
                                      │            ├─ pgvector cosine (semantic)
                                      │            └─ tsvector rank (keyword)
                                      │         fused with Reciprocal Rank Fusion
                                      ▼
                          system prompt + CONTEXT + history
                                      │
                                      ▼
                          Ollama chat (streamed via SSE)
                                      │
                       tokens + citations ──▶ browser
```

## Hybrid search

`lib/rag.ts` runs two retrievers and fuses them with Reciprocal Rank Fusion
(RRF), which is robust without score normalization:

- **Semantic:** `embedding <=> $query::vector` ordered by cosine distance, using
  an HNSW index (`vector_cosine_ops`).
- **Keyword:** `to_tsvector('english', content) @@ plainto_tsquery(...)` ranked
  by `ts_rank`, backed by a GIN index; trigram indexes support fuzzy matching.

If Ollama is unavailable, semantic retrieval is skipped and keyword results
still return — the system degrades gracefully.

## Persistence & migrations

The API entrypoint (`apps/api/docker-entrypoint.sh`) waits for Postgres, syncs
the schema (`prisma db push`), then runs `scripts/post-migrate.ts` which:

- ensures the `vector` and `pg_trgm` extensions exist,
- pins `DocumentChunk.embedding` to `vector(EMBEDDING_DIM)`,
- creates the HNSW ANN index and full-text/trigram indexes.

It then seeds the bootstrap admin and demo data (idempotent) and starts the API.

## Auth

- `POST /api/auth/login` verifies a bcrypt hash and creates an `AuthSession`
  row; the signed session id is stored in an HTTP-only cookie.
- Every request resolves `req.user` from the cookie (respecting expiry and the
  `disabled` flag). `authenticate` and `authorize(...roles)` guard routes.

## Performance posture

- Indexed foreign keys and status columns for the common list/filter queries.
- HNSW ANN index scales to millions of embeddings with sub-second recall.
- Streaming chat over SSE; the worker indexes in the background off the request
  path. Pagination is enforced on all list endpoints.

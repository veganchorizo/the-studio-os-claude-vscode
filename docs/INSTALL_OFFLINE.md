# Offline installation

The Studio OS is designed to run on an air-gapped machine. The only step that
may require connectivity is obtaining the container images and the Ollama
models **once**; after that the system is fully self-contained.

## 1. Prepare images on a connected machine

```bash
# Pull the base images used by the stack.
docker compose pull                 # pgvector, ollama, nginx base images
docker compose build                # build web/api/worker/ingest/backups

# Save every image to a tarball you can copy to the offline host.
docker save \
  pgvector/pgvector:pg16 \
  ollama/ollama:latest \
  nginx:1.27-alpine \
  studio-os-studio-os-api \
  studio-os-studio-os-web \
  studio-os-studio-os-worker \
  studio-os-studio-os-ingest \
  studio-os-studio-os-backups \
  -o studio-os-images.tar
```

> Image names for locally-built services are prefixed with the compose project
> name (`studio-os`). Run `docker images` to confirm exact tags.

## 2. Pre-seed the Ollama models

Models live in the `ollama-data` volume. On the connected machine:

```bash
docker compose up -d studio-os-ollama
docker exec -it studio-os-ollama ollama pull llama3.1:8b
docker exec -it studio-os-ollama ollama pull nomic-embed-text
```

Then export the volume:

```bash
docker run --rm -v studio-os_ollama-data:/data -v "$PWD":/out alpine \
  tar czf /out/ollama-data.tar.gz -C /data .
```

## 3. Transfer to the offline host

Copy `studio-os-images.tar`, `ollama-data.tar.gz`, the repository, and your
`.env` to the target machine (USB drive, internal network, etc.).

## 4. Load everything offline

```bash
docker load -i studio-os-images.tar

# Recreate and populate the ollama volume.
docker volume create studio-os_ollama-data
docker run --rm -v studio-os_ollama-data:/data -v "$PWD":/in alpine \
  tar xzf /in/ollama-data.tar.gz -C /data

docker compose up -d
```

## 5. Verify

```bash
curl -s http://localhost:8080/health | jq
# { "status": "ok", "db": true, "ollama": true, ... }
```

## Notes on Prisma engines (offline builds)

`prisma generate` downloads a query-engine binary during install. When building
images on a connected machine this happens automatically and the binary is
baked into the image, so the **offline host never needs it**. If you must build
on an air-gapped machine, pre-populate the pnpm store and set
`PRISMA_ENGINES_MIRROR` to a local mirror, or copy a warmed `node_modules`.

## Choosing models

Any GGUF / llama.cpp-compatible model served by Ollama works. Set `LLM_MODEL`
and `EMBEDDING_MODEL` in `.env`. **`EMBEDDING_DIM` must match** the embedding
model's output dimensionality (e.g. `nomic-embed-text` = 768). Changing the
embedding model or dimension re-types the vector column and requires re-indexing
documents (delete + re-drop them into the watch folder).

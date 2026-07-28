# syntax=docker/dockerfile:1
# Postgres + pgvector with The Studio OS init scripts baked in, so the stack
# can be pulled and run without any source files on the host.
FROM pgvector/pgvector:pg16

COPY docker/db/init/ /docker-entrypoint-initdb.d/

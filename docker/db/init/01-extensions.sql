-- Runs once, on first initialization of the Postgres data volume.
-- Enables the extensions The Studio OS relies on for hybrid search.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

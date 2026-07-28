/**
 * Idempotent post-migration step.
 *
 * Prisma's `Unsupported("vector")` column is created without a fixed dimension
 * and without an ANN index. This script:
 *   1. ensures required extensions exist,
 *   2. pins the embedding column to the configured dimension,
 *   3. creates an HNSW index for fast cosine similarity,
 *   4. adds trigram + full-text indexes that power hybrid keyword search.
 *
 * It is safe to run on every boot.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIM = Number(process.env.EMBEDDING_DIM ?? 768);

async function columnType(table: string, column: string): Promise<string | null> {
  const rows = await prisma.$queryRawUnsafe<{ udt: string; typmod: number }[]>(
    `SELECT format_type(a.atttypid, a.atttypmod) AS udt, a.atttypmod AS typmod
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relname = $1 AND a.attname = $2 AND a.attnum > 0 AND NOT a.attisdropped`,
    table,
    column,
  );
  return rows[0]?.udt ?? null;
}

async function main(): Promise<void> {
  console.log(`[post-migrate] ensuring extensions + vector(${DIM}) + indexes`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  const current = await columnType("DocumentChunk", "embedding");
  if (current && current !== `vector(${DIM})`) {
    // Re-type only when needed. Existing embeddings of a different dim are cleared.
    console.log(`[post-migrate] retyping embedding ${current} -> vector(${DIM})`);
    await prisma.$executeRawUnsafe(`UPDATE "DocumentChunk" SET embedding = NULL`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DocumentChunk" ALTER COLUMN embedding TYPE vector(${DIM})`,
    );
  } else if (current) {
    console.log(`[post-migrate] embedding already ${current}`);
  }

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS documentchunk_embedding_hnsw
     ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops)`,
  );

  // Full text search over extracted document text.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS document_content_fts
     ON "Document" USING GIN (to_tsvector('english', coalesce(content, '') || ' ' || coalesce(title, '')))`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS documentchunk_content_fts
     ON "DocumentChunk" USING GIN (to_tsvector('english', content))`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS documentchunk_content_trgm
     ON "DocumentChunk" USING GIN (content gin_trgm_ops)`,
  );

  // Trigram indexes for fuzzy keyword search on core entities.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS session_title_trgm ON "RecordingSession" USING GIN (title gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS equipment_search_trgm ON "Equipment" USING GIN ((manufacturer || ' ' || model) gin_trgm_ops)`,
  );

  console.log("[post-migrate] done");
}

main()
  .catch((err) => {
    console.error("[post-migrate] failed", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

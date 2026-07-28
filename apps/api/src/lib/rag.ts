import type { Citation } from "@studio-os/shared";
import { prisma } from "./prisma.js";
import { ollama } from "./ollama.js";

/** Serialize a JS number[] into a pgvector literal, e.g. "[0.1,0.2]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}

interface RankedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
}

/**
 * Hybrid retrieval: combine pgvector cosine similarity with Postgres full-text
 * ranking using Reciprocal Rank Fusion (RRF). Falls back gracefully to
 * keyword-only when embeddings are unavailable (e.g. Ollama offline).
 */
export async function retrieve(query: string, k = 6): Promise<RankedChunk[]> {
  const K = 60; // RRF constant
  const scores = new Map<string, RankedChunk & { rrf: number }>();

  // --- keyword branch (always available) ---
  const keywordRows = await prisma.$queryRawUnsafe<
    { id: string; documentId: string; title: string; content: string; rank: number }[]
  >(
    `SELECT c.id, c."documentId", d.title, c.content,
            ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', $1)) AS rank
     FROM "DocumentChunk" c
     JOIN "Document" d ON d.id = c."documentId"
     WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    query,
    k * 3,
  );
  keywordRows.forEach((row, i) => {
    const rrf = 1 / (K + i + 1);
    scores.set(row.id, {
      chunkId: row.id,
      documentId: row.documentId,
      title: row.title,
      content: row.content,
      score: row.rank,
      rrf,
    });
  });

  // --- semantic branch (best-effort) ---
  try {
    const embedding = await ollama.embed(query);
    const literal = toVectorLiteral(embedding);
    const semanticRows = await prisma.$queryRawUnsafe<
      { id: string; documentId: string; title: string; content: string; distance: number }[]
    >(
      `SELECT c.id, c."documentId", d.title, c.content,
              c.embedding <=> $1::vector AS distance
       FROM "DocumentChunk" c
       JOIN "Document" d ON d.id = c."documentId"
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      literal,
      k * 3,
    );
    semanticRows.forEach((row, i) => {
      const rrf = 1 / (K + i + 1);
      const existing = scores.get(row.id);
      if (existing) {
        existing.rrf += rrf;
      } else {
        scores.set(row.id, {
          chunkId: row.id,
          documentId: row.documentId,
          title: row.title,
          content: row.content,
          score: 1 - row.distance,
          rrf,
        });
      }
    });
  } catch (err) {
    // Semantic retrieval is optional; keyword results still return.
    console.warn("[rag] semantic retrieval unavailable:", (err as Error).message);
  }

  return [...scores.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, k)
    .map(({ rrf, ...c }) => ({ ...c, score: rrf }));
}

export function chunksToCitations(chunks: RankedChunk[]): Citation[] {
  return chunks.map((c) => ({
    documentId: c.documentId,
    chunkId: c.chunkId,
    sourceType: "document",
    sourceId: c.documentId,
    title: c.title,
    snippet: c.content.slice(0, 280),
    score: c.score,
  }));
}

export function buildContextBlock(chunks: RankedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[[${i + 1}]] Source: ${c.title}\n${c.content}`)
    .join("\n\n---\n\n");
}

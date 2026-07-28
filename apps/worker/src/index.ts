import { PrismaClient } from "@prisma/client";
import { extractText } from "./parsers.js";
import { chunkText } from "./chunk.js";
import { embed, toVectorLiteral } from "./embeddings.js";

const prisma = new PrismaClient();
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 1000);
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP ?? 150);
const POLL_MS = 3000;

let running = true;

/** Process a single pending document end-to-end: parse -> chunk -> embed. */
async function processDocument(id: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.storagePath) return;

  try {
    await prisma.document.update({ where: { id }, data: { status: "PARSING" } });
    const text = await extractText(doc.storagePath, doc.type);

    await prisma.document.update({
      where: { id },
      data: { status: "CHUNKING", content: text.slice(0, 5_000_000) },
    });
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);

    // Reset any prior chunks (re-index / version bump).
    await prisma.documentChunk.deleteMany({ where: { documentId: id } });
    await prisma.document.update({ where: { id }, data: { status: "EMBEDDING" } });

    for (const chunk of chunks) {
      const created = await prisma.documentChunk.create({
        data: {
          documentId: id,
          index: chunk.index,
          content: chunk.content,
          tokens: Math.ceil(chunk.content.length / 4),
          metadata: { title: doc.title },
        },
      });
      try {
        const vector = await embed(chunk.content);
        await prisma.$executeRawUnsafe(
          `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
          toVectorLiteral(vector),
          created.id,
        );
      } catch (err) {
        // Keep the chunk (keyword-searchable) even if embedding failed.
        console.warn(`[worker] embedding failed for chunk ${created.id}:`, (err as Error).message);
      }
    }

    await prisma.document.update({
      where: { id },
      data: { status: "INDEXED", error: null },
    });
    console.log(`[worker] indexed '${doc.title}' (${chunks.length} chunks)`);
  } catch (err) {
    await prisma.document.update({
      where: { id },
      data: { status: "FAILED", error: (err as Error).message },
    });
    console.error(`[worker] failed to index ${id}:`, (err as Error).message);
  }
}

/** Predictive maintenance: flag equipment whose scheduled service is due soon. */
async function predictMaintenance(): Promise<void> {
  const soon = new Date(Date.now() + 7 * 86400000);
  const due = await prisma.maintenanceRecord.findMany({
    where: { nextDueAt: { lte: soon } },
    include: { equipment: true },
  });
  for (const rec of due) {
    if (rec.equipment.status === "OPERATIONAL") {
      await prisma.equipment.update({ where: { id: rec.equipmentId }, data: { status: "NEEDS_SERVICE" } });
      await prisma.notification.create({
        data: {
          title: `Maintenance due: ${rec.equipment.manufacturer} ${rec.equipment.model}`,
          body: `A ${rec.kind} is scheduled for ${rec.nextDueAt?.toDateString()}.`,
          level: "WARNING",
        },
      });
    }
  }
}

async function tick(): Promise<void> {
  const pending = await prisma.document.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: Number(process.env.WORKER_CONCURRENCY ?? 2),
  });
  await Promise.all(pending.map((d) => processDocument(d.id)));
}

async function main(): Promise<void> {
  console.log("[worker] started; polling for documents to index");
  let ticks = 0;
  while (running) {
    try {
      await tick();
      if (ticks % 100 === 0) await predictMaintenance();
    } catch (err) {
      console.error("[worker] tick error:", (err as Error).message);
    }
    ticks++;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

process.on("SIGTERM", () => {
  running = false;
});
process.on("SIGINT", () => {
  running = false;
});

main()
  .catch((err) => {
    console.error("[worker] fatal:", err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

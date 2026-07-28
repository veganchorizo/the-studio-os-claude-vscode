import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import { PrismaClient, type DocumentType } from "@prisma/client";

const prisma = new PrismaClient();
const WATCH_DIR = process.env.WATCH_DIR ?? "/data/watch";
const STORAGE_DIR = process.env.STORAGE_DIR ?? "/data/storage";

function detectType(filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, DocumentType> = {
    ".pdf": "PDF",
    ".doc": "WORD",
    ".docx": "WORD",
    ".md": "MARKDOWN",
    ".markdown": "MARKDOWN",
    ".txt": "TEXT",
    ".csv": "CSV",
    ".json": "JSON",
    ".xml": "XML",
    ".png": "IMAGE",
    ".jpg": "IMAGE",
    ".jpeg": "IMAGE",
    ".tiff": "IMAGE",
    ".webp": "IMAGE",
    ".mbox": "MBOX",
  };
  return map[ext] ?? "OTHER";
}

async function checksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

/**
 * Ingest a newly observed file. Originals are copied into content-addressed
 * storage and NEVER overwritten. If the file content changed (new checksum),
 * a new Document version is created that supersedes the previous one.
 */
async function ingestFile(filePath: string): Promise<void> {
  try {
    const filename = path.basename(filePath);
    const sum = await checksum(filePath);

    // Skip if this exact content is already stored.
    const dup = await prisma.document.findFirst({ where: { checksum: sum } });
    if (dup) {
      console.log(`[ingest] '${filename}' already ingested (checksum match), skipping`);
      return;
    }

    const type = detectType(filename);
    const stored = path.join(STORAGE_DIR, `${sum}${path.extname(filename)}`);
    await mkdir(STORAGE_DIR, { recursive: true });
    await copyFile(filePath, stored);

    // Version chain: look for a prior document with the same source filename.
    const prior = await prisma.document.findFirst({
      where: { sourcePath: filePath },
      orderBy: { version: "desc" },
    });

    const size = (await readFile(stored)).byteLength;
    const created = await prisma.document.create({
      data: {
        title: filename,
        type,
        status: "PENDING",
        sourcePath: filePath,
        storagePath: stored,
        checksum: sum,
        sizeBytes: size,
        version: (prior?.version ?? 0) + 1,
        supersedes: prior?.id ?? null,
        metadata: { ingestedAt: new Date().toISOString(), originalName: filename },
      },
    });
    console.log(`[ingest] registered '${filename}' as document ${created.id} v${created.version}`);
  } catch (err) {
    console.error(`[ingest] failed to ingest ${filePath}:`, (err as Error).message);
  }
}

async function main(): Promise<void> {
  await mkdir(WATCH_DIR, { recursive: true });
  await mkdir(STORAGE_DIR, { recursive: true });
  console.log(`[ingest] watching ${WATCH_DIR}`);

  const watcher = chokidar.watch(WATCH_DIR, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
    depth: 10,
  });

  watcher.on("add", (p) => void ingestFile(p));
  watcher.on("change", (p) => void ingestFile(p));

  const shutdown = async () => {
    await watcher.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});

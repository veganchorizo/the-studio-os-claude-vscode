import type { FastifyInstance } from "fastify";
import { documentListQuerySchema } from "@studio-os/shared";
import type { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

function toDto(d: PrismaNS.DocumentGetPayload<{ include: { _count: { select: { chunks: true } } } }>) {
  return {
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.status,
    sourcePath: d.sourcePath,
    storagePath: d.storagePath,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    checksum: d.checksum,
    version: d.version,
    metadata: d.metadata as Record<string, unknown>,
    tags: d.tags,
    chunkCount: d._count.chunks,
    error: d.error,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function documentRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };

  app.get("/api/documents", auth, async (req) => {
    const query = documentListQuerySchema.parse(req.query);
    const where: PrismaNS.DocumentWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.q) where.title = { contains: query.q, mode: "insensitive" };

    const [total, rows] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        include: { _count: { select: { chunks: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(toDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  });

  app.get("/api/documents/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const d = await prisma.document.findUnique({
      where: { id },
      include: { _count: { select: { chunks: true } } },
    });
    if (!d) throw notFound("Document", id);
    return toDto(d);
  });

  app.get("/api/documents/:id/versions", auth, async (req) => {
    const { id } = req.params as { id: string };
    // A version chain is linked via the `supersedes` pointer.
    const chain: unknown[] = [];
    let cursor: string | null = id;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      const d: { id: string; version: number; supersedes: string | null; createdAt: Date } | null =
        await prisma.document.findUnique({
          where: { id: cursor },
          select: { id: true, version: true, supersedes: true, createdAt: true },
        });
      if (!d) break;
      chain.push({ id: d.id, version: d.version, createdAt: d.createdAt.toISOString() });
      cursor = d.supersedes;
    }
    return chain;
  });
}

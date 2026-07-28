import { z } from "zod";

export const documentTypeSchema = z.enum([
  "PDF",
  "WORD",
  "MARKDOWN",
  "TEXT",
  "CSV",
  "JSON",
  "XML",
  "IMAGE",
  "MBOX",
  "OTHER",
]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const documentStatusSchema = z.enum([
  "PENDING",
  "PARSING",
  "CHUNKING",
  "EMBEDDING",
  "INDEXED",
  "FAILED",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: documentTypeSchema,
  status: documentStatusSchema,
  sourcePath: z.string().nullable(),
  storagePath: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  checksum: z.string().nullable(),
  version: z.number().int().min(1),
  metadata: z.record(z.unknown()),
  tags: z.array(z.string()),
  chunkCount: z.number().int().nonnegative(),
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type KnowledgeDocument = z.infer<typeof documentSchema>;

export const documentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  index: z.number().int().nonnegative(),
  content: z.string(),
  tokens: z.number().int().nonnegative().nullable(),
  metadata: z.record(z.unknown()),
});
export type DocumentChunk = z.infer<typeof documentChunkSchema>;

export const documentListQuerySchema = z.object({
  q: z.string().optional(),
  type: documentTypeSchema.optional(),
  status: documentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

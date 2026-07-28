import { z } from "zod";

export const searchEntityTypeSchema = z.enum([
  "document",
  "session",
  "client",
  "equipment",
  "note",
  "conversation",
  "project",
  "task",
  "artist",
]);
export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(1000),
  types: z.array(searchEntityTypeSchema).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  mode: z.enum(["hybrid", "semantic", "keyword"]).default("hybrid"),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchHitSchema = z.object({
  type: searchEntityTypeSchema,
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
  keywordScore: z.number().nullable(),
  semanticScore: z.number().nullable(),
  url: z.string(),
});
export type SearchHit = z.infer<typeof searchHitSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  mode: z.string(),
  hits: z.array(searchHitSchema),
  tookMs: z.number(),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

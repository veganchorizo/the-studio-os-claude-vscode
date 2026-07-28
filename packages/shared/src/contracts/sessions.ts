import { z } from "zod";

export const sessionStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "TRACKING",
  "MIXING",
  "MASTERING",
  "COMPLETED",
  "CANCELLED",
]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const micUseSchema = z.object({
  equipmentId: z.string(),
  source: z.string().max(200), // e.g. "Lead vocal", "Kick in"
  position: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type MicUse = z.infer<typeof micUseSchema>;

export const cueMixSchema = z.object({
  name: z.string().max(120), // e.g. "Drummer", "Vocalist"
  notes: z.string().max(2000),
});
export type CueMix = z.infer<typeof cueMixSchema>;

export const mixRevisionSchema = z.object({
  id: z.string(),
  version: z.number().int().min(1),
  label: z.string().max(200).nullable(),
  notes: z.string().nullable(),
  documentId: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type MixRevision = z.infer<typeof mixRevisionSchema>;

export const songSchema = z.object({
  id: z.string(),
  title: z.string().max(300),
  bpm: z.number().int().positive().nullable().optional(),
  key: z.string().max(20).nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type Song = z.infer<typeof songSchema>;

export const recordingSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: sessionStatusSchema,
  date: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  room: z.string().nullable(),
  artistId: z.string().nullable(),
  projectId: z.string().nullable(),
  clientId: z.string().nullable(),
  engineerId: z.string().nullable(),
  assistantId: z.string().nullable(),
  notes: z.string().nullable(),
  problems: z.string().nullable(),
  patching: z.string().nullable(),
  outboard: z.array(z.string()),
  songs: z.array(songSchema),
  micUses: z.array(micUseSchema),
  cueMixes: z.array(cueMixSchema),
  deliverables: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RecordingSession = z.infer<typeof recordingSessionSchema>;

export const recordingSessionDetailSchema = recordingSessionSchema.extend({
  mixRevisions: z.array(mixRevisionSchema),
  photoDocumentIds: z.array(z.string()),
  fileDocumentIds: z.array(z.string()),
  invoiceIds: z.array(z.string()),
});
export type RecordingSessionDetail = z.infer<typeof recordingSessionDetailSchema>;

export const createSessionInputSchema = z.object({
  title: z.string().min(1).max(300),
  status: sessionStatusSchema.default("SCHEDULED"),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  room: z.string().max(120).optional(),
  artistId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  engineerId: z.string().optional(),
  assistantId: z.string().optional(),
  notes: z.string().max(50000).optional(),
  problems: z.string().max(50000).optional(),
  patching: z.string().max(50000).optional(),
  outboard: z.array(z.string()).default([]),
  songs: z.array(songSchema.omit({ id: true })).default([]),
  micUses: z.array(micUseSchema).default([]),
  cueMixes: z.array(cueMixSchema).default([]),
  deliverables: z.array(z.string()).default([]),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const updateSessionInputSchema = createSessionInputSchema.partial();
export type UpdateSessionInput = z.infer<typeof updateSessionInputSchema>;

export const sessionListQuerySchema = z.object({
  q: z.string().optional(),
  status: sessionStatusSchema.optional(),
  artistId: z.string().optional(),
  projectId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.enum(["date", "createdAt", "title", "status"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

export const addMixRevisionInputSchema = z.object({
  label: z.string().max(200).optional(),
  notes: z.string().max(50000).optional(),
  documentId: z.string().optional(),
});
export type AddMixRevisionInput = z.infer<typeof addMixRevisionInputSchema>;

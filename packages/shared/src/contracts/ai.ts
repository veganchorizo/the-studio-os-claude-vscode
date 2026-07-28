import { z } from "zod";

export const agentKindSchema = z.enum([
  "CHIEF_ENGINEER",
  "STUDIO_MANAGER",
  "MARKETING_DIRECTOR",
  "BUSINESS_ANALYST",
  "ARCHIVIST",
  "MAINTENANCE_MANAGER",
  "INTERN_TRAINER",
]);
export type AgentKind = z.infer<typeof agentKindSchema>;

export const chatRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const citationSchema = z.object({
  documentId: z.string().nullable(),
  chunkId: z.string().nullable(),
  sourceType: z.string(), // "document" | "session" | "equipment" | ...
  sourceId: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
});
export type Citation = z.infer<typeof citationSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  citations: z.array(citationSchema),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  agent: agentKindSchema,
  workspaceId: z.string().nullable(),
  pinned: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const createConversationInputSchema = z.object({
  title: z.string().max(300).optional(),
  agent: agentKindSchema.default("CHIEF_ENGINEER"),
  workspaceId: z.string().optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

export const sendMessageInputSchema = z.object({
  conversationId: z.string().optional(),
  agent: agentKindSchema.default("CHIEF_ENGINEER"),
  message: z.string().min(1).max(50000),
  useRag: z.boolean().default(true),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

/** Server-sent-event payloads streamed from POST /api/ai/chat. */
export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("meta"), conversationId: z.string(), messageId: z.string() }),
  z.object({ type: z.literal("citations"), citations: z.array(citationSchema) }),
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({ type: z.literal("done"), finishReason: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

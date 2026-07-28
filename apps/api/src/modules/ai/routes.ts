import type { FastifyInstance } from "fastify";
import type { Prisma as PrismaNS } from "@prisma/client";
import {
  createConversationInputSchema,
  sendMessageInputSchema,
  type ChatStreamEvent,
} from "@studio-os/shared";
import { prisma } from "../../lib/prisma.js";
import { ollama, type ChatMessage } from "../../lib/ollama.js";
import { retrieve, chunksToCitations, buildContextBlock } from "../../lib/rag.js";
import { AGENTS } from "./agents.js";
import { notFound } from "../../lib/errors.js";

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };

  app.get("/api/ai/agents", auth, async () =>
    Object.values(AGENTS).map((a) => ({ kind: a.kind, name: a.name, description: a.description })),
  );

  app.get("/api/ai/conversations", auth, async () => {
    const rows = await prisma.conversation.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      agent: c.agent,
      workspaceId: c.workspaceId,
      pinned: c.pinned,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  });

  app.get("/api/ai/conversations/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const c = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!c) throw notFound("Conversation", id);
    return {
      id: c.id,
      title: c.title,
      agent: c.agent,
      pinned: c.pinned,
      messages: c.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        citations: m.citations,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });

  app.post("/api/ai/conversations", auth, async (req, reply) => {
    const input = createConversationInputSchema.parse(req.body);
    const c = await prisma.conversation.create({
      data: {
        title: input.title ?? "New conversation",
        agent: input.agent,
        workspaceId: input.workspaceId ?? null,
        userId: req.user!.id,
      },
    });
    reply.code(201);
    return { id: c.id };
  });

  app.patch("/api/ai/conversations/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as { title?: string; pinned?: boolean };
    const c = await prisma.conversation.update({
      where: { id },
      data: { title: body.title, pinned: body.pinned },
    });
    return { id: c.id, title: c.title, pinned: c.pinned };
  });

  app.delete("/api/ai/conversations/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.conversation.delete({ where: { id } });
    reply.code(204);
  });

  /**
   * Streaming chat endpoint. Emits server-sent events:
   *   meta -> citations -> token* -> done
   * All inference is local (Ollama). RAG context comes from the local KB.
   */
  app.post("/api/ai/chat", auth, async (req, reply) => {
    const input = sendMessageInputSchema.parse(req.body);
    const agent = AGENTS[input.agent];

    // Ensure a conversation exists.
    let conversationId = input.conversationId;
    if (!conversationId) {
      const created = await prisma.conversation.create({
        data: {
          title: input.message.slice(0, 60),
          agent: input.agent,
          userId: req.user!.id,
        },
      });
      conversationId = created.id;
    }

    // Persist the user's message.
    await prisma.chatMessage.create({
      data: { conversationId, role: "user", content: input.message },
    });

    // Retrieve grounding context.
    const chunks = input.useRag ? await retrieve(input.message) : [];
    const citations = chunksToCitations(chunks);
    const contextBlock = buildContextBlock(chunks);

    // Build the prompt from recent history + context.
    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const ordered = history.reverse();
    const messages: ChatMessage[] = [
      { role: "system", content: agent.systemPrompt },
    ];
    if (contextBlock) {
      messages.push({ role: "system", content: `CONTEXT:\n${contextBlock}` });
    }
    for (const m of ordered) {
      if (m.role === "user" || m.role === "assistant") {
        messages.push({ role: m.role, content: m.content });
      }
    }

    // Take over the raw socket for Server-Sent Events; Fastify won't send a body.
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    const send = (evt: ChatStreamEvent): void => {
      reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
    };

    const assistantMsg = await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: "",
        citations: citations as unknown as PrismaNS.InputJsonValue,
      },
    });

    send({ type: "meta", conversationId, messageId: assistantMsg.id });
    if (citations.length) send({ type: "citations", citations });

    let full = "";
    try {
      for await (const part of ollama.chatStream(messages)) {
        if (part.token) {
          full += part.token;
          send({ type: "token", value: part.token });
        }
        if (part.done) break;
      }
      await prisma.chatMessage.update({ where: { id: assistantMsg.id }, data: { content: full } });
      await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      send({ type: "done", finishReason: "stop" });
    } catch (err) {
      send({ type: "error", message: (err as Error).message });
    } finally {
      reply.raw.end();
    }
  });
}

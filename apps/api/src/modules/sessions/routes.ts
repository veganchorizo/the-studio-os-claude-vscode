import type { FastifyInstance } from "fastify";
import {
  createSessionInputSchema,
  updateSessionInputSchema,
  sessionListQuerySchema,
  addMixRevisionInputSchema,
} from "@studio-os/shared";
import { sessionService } from "./service.js";
import { audit } from "../../lib/audit.js";

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };
  const write = { onRequest: [app.authorize("ADMIN", "ENGINEER", "MANAGER")] };

  app.get("/api/sessions", auth, async (req) => {
    const query = sessionListQuerySchema.parse(req.query);
    return sessionService.list(query);
  });

  app.get("/api/sessions/:id", auth, async (req) => {
    const { id } = req.params as { id: string };
    return sessionService.get(id);
  });

  app.post("/api/sessions", write, async (req, reply) => {
    const input = createSessionInputSchema.parse(req.body);
    const created = await sessionService.create(input);
    await audit({ userId: req.user!.id, action: "session.create", entity: "RecordingSession", entityId: created.id, ip: req.ip });
    reply.code(201);
    return created;
  });

  app.patch("/api/sessions/:id", write, async (req) => {
    const { id } = req.params as { id: string };
    const input = updateSessionInputSchema.parse(req.body);
    const updated = await sessionService.update(id, input);
    await audit({ userId: req.user!.id, action: "session.update", entity: "RecordingSession", entityId: id, ip: req.ip });
    return updated;
  });

  app.delete("/api/sessions/:id", write, async (req, reply) => {
    const { id } = req.params as { id: string };
    await sessionService.remove(id);
    await audit({ userId: req.user!.id, action: "session.delete", entity: "RecordingSession", entityId: id, ip: req.ip });
    reply.code(204);
  });

  app.post("/api/sessions/:id/mix-revisions", write, async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = addMixRevisionInputSchema.parse(req.body);
    const rev = await sessionService.addMixRevision(id, input);
    reply.code(201);
    return rev;
  });
}

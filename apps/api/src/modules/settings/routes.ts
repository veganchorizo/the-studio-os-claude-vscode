import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { audit } from "../../lib/audit.js";

const putSchema = z.object({ value: z.unknown() });

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const auth = { onRequest: [app.authenticate] };
  const admin = { onRequest: [app.authorize("ADMIN")] };

  app.get("/api/settings", auth, async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  app.put("/api/settings/:key", admin, async (req) => {
    const { key } = req.params as { key: string };
    const { value } = putSchema.parse(req.body);
    const row = await prisma.setting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
    await audit({ userId: req.user!.id, action: "settings.update", entity: "Setting", entityId: key, ip: req.ip });
    return { key: row.key, value: row.value };
  });
}

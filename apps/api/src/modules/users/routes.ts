import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { createUserInputSchema } from "@studio-os/shared";
import { prisma } from "../../lib/prisma.js";
import { audit } from "../../lib/audit.js";
import { conflict, notFound } from "../../lib/errors.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // All user management requires ADMIN.
  const admin = { onRequest: [app.authorize("ADMIN")] };

  app.get("/api/users", admin, async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      displayName: u.displayName,
      disabled: u.disabled,
      createdAt: u.createdAt.toISOString(),
    }));
  });

  app.post("/api/users", admin, async (req, reply) => {
    const body = createUserInputSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) throw conflict("Username already taken");
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email ?? null,
        displayName: body.displayName ?? null,
        role: body.role,
        passwordHash,
      },
    });
    await audit({ userId: req.user!.id, action: "user.create", entity: "User", entityId: user.id, ip: req.ip });
    reply.code(201);
    return { id: user.id, username: user.username, role: user.role };
  });

  app.patch("/api/users/:id", admin, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as { role?: string; disabled?: boolean; displayName?: string };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound("User", id);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: body.role as never,
        disabled: body.disabled,
        displayName: body.displayName,
      },
    });
    await audit({ userId: req.user!.id, action: "user.update", entity: "User", entityId: id, ip: req.ip });
    return { id: updated.id, role: updated.role, disabled: updated.disabled };
  });
}

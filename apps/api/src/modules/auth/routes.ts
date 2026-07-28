import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { loginInputSchema, changePasswordInputSchema } from "@studio-os/shared";
import { prisma } from "../../lib/prisma.js";
import { createSession, destroySession } from "../../plugins/auth.js";
import { audit } from "../../lib/audit.js";
import { badRequest, unauthorized } from "../../lib/errors.js";

function toDto(u: {
  id: string;
  username: string;
  email: string | null;
  role: string;
  displayName: string | null;
  createdAt: Date;
}) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    displayName: u.displayName,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/login", async (req, reply) => {
    const body = loginInputSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: body.username } });
    // Constant-ish work whether or not the user exists.
    const hash = user?.passwordHash ?? "$2a$12$0000000000000000000000000000000000000000000000000000";
    const ok = await bcrypt.compare(body.password, hash);
    if (!user || user.disabled || !ok) {
      await audit({ action: "auth.login.failed", entity: "User", metadata: { username: body.username }, ip: req.ip });
      throw unauthorized("Invalid username or password");
    }
    await createSession(reply, user.id, { userAgent: req.headers["user-agent"], ip: req.ip });
    await audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip: req.ip });
    return toDto(user);
  });

  app.post("/api/auth/logout", async (req, reply) => {
    if (req.user) {
      await audit({ userId: req.user.id, action: "auth.logout", entity: "User", entityId: req.user.id, ip: req.ip });
    }
    await destroySession(req, reply);
    return { ok: true };
  });

  app.get("/api/auth/me", { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    return toDto(user);
  });

  app.post("/api/auth/change-password", { onRequest: [app.authenticate] }, async (req) => {
    const body = changePasswordInputSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) throw badRequest("Current password is incorrect");
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await audit({ userId: user.id, action: "auth.password.changed", entity: "User", entityId: user.id, ip: req.ip });
    return { ok: true };
  });
}

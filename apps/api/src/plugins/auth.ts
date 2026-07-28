import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@studio-os/shared";
import { prisma } from "../lib/prisma.js";
import { loadConfig } from "../config.js";
import { forbidden, unauthorized } from "../lib/errors.js";

export interface AuthedUser {
  id: string;
  username: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthedUser | null;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (...roles: Role[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Session-cookie auth. The cookie carries a signed opaque session id; the
 * session row (with expiry) lives in Postgres so logout/expiry are enforceable.
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  const config = loadConfig();
  const cookieName = config.SESSION_COOKIE_NAME;

  app.decorateRequest("user", null);

  // Resolve the current user from the session cookie on every request.
  app.addHook("onRequest", async (req) => {
    const raw = req.cookies[cookieName];
    if (!raw) return;
    const unsigned = req.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return;
    const session = await prisma.authSession.findUnique({
      where: { id: unsigned.value },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || session.user.disabled) return;
    req.user = {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
    };
  });

  app.decorate("authenticate", async (req: FastifyRequest) => {
    if (!req.user) throw unauthorized();
  });

  app.decorate("authorize", (...roles: Role[]) => {
    return async (req: FastifyRequest) => {
      if (!req.user) throw unauthorized();
      if (roles.length && !roles.includes(req.user.role)) throw forbidden();
    };
  });
});

/** Create a persistent session row and set the signed cookie. */
export async function createSession(
  reply: FastifyReply,
  userId: string,
  meta: { userAgent?: string; ip?: string },
): Promise<void> {
  const config = loadConfig();
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3600 * 1000);
  const session = await prisma.authSession.create({
    data: { userId, expiresAt, userAgent: meta.userAgent ?? null, ip: meta.ip ?? null },
  });
  reply.setCookie(config.SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    signed: true,
    secure: config.isProd,
    maxAge: config.SESSION_TTL_HOURS * 3600,
  });
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = loadConfig();
  const raw = req.cookies[config.SESSION_COOKIE_NAME];
  if (raw) {
    const unsigned = req.unsignCookie(raw);
    if (unsigned.valid && unsigned.value) {
      await prisma.authSession.deleteMany({ where: { id: unsigned.value } });
    }
  }
  reply.clearCookie(config.SESSION_COOKIE_NAME, { path: "/" });
}

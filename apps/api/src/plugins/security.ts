import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";

/**
 * Security posture: strict CSP (no external origins), CORS locked to the web
 * origin, signed cookies, and rate limiting. Consistent with the offline,
 * local-only philosophy — the browser is never allowed to reach the internet.
 */
export const securityPlugin = fp(async (app: FastifyInstance) => {
  const config = loadConfig();

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        // connect-src is 'self' only: the SPA may only talk to its own origin.
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cors, {
    origin: config.WEB_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.SESSION_SECRET,
    parseOptions: { httpOnly: true, sameSite: "lax", path: "/" },
  });

  await app.register(rateLimit, {
    max: 600,
    timeWindow: "1 minute",
    allowList: (req) => req.url === "/health",
  });
});

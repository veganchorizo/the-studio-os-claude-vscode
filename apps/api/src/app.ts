import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";
import { AppError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import { ollama } from "./lib/ollama.js";
import { securityPlugin } from "./plugins/security.js";
import { authPlugin } from "./plugins/auth.js";
import { pluginRegistry } from "./plugin-system/registry.js";

import { authRoutes } from "./modules/auth/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { sessionRoutes } from "./modules/sessions/routes.js";
import { equipmentRoutes } from "./modules/equipment/routes.js";
import { aiRoutes } from "./modules/ai/routes.js";
import { documentRoutes } from "./modules/documents/routes.js";
import { searchRoutes } from "./modules/search/routes.js";
import { resourceRoutes } from "./modules/resources/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({
    logger: {
      level: config.isProd ? "info" : "debug",
      // Never log request bodies (may contain credentials/PII) in production.
      redact: ["req.headers.cookie", "req.headers.authorization"],
    },
    trustProxy: true,
    bodyLimit: 25 * 1024 * 1024,
  });

  // Centralized error shaping into the shared ApiError contract.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: err.issues, requestId: req.id },
      });
      return;
    }
    if (err instanceof AppError) {
      reply.code(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
      });
      return;
    }
    req.log.error(err);
    reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId: req.id },
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.url} not found` } });
  });

  await app.register(securityPlugin);
  await app.register(authPlugin);

  // Health check (used by Docker health checks). No auth, no external calls.
  app.get("/health", async () => {
    const [db, llm] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, ollama.ping()]);
    return {
      status: "ok",
      db: db.status === "fulfilled",
      ollama: llm.status === "fulfilled" && llm.value === true,
      time: new Date().toISOString(),
    };
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(sessionRoutes);
  await app.register(equipmentRoutes);
  await app.register(aiRoutes);
  await app.register(documentRoutes);
  await app.register(searchRoutes);
  await app.register(resourceRoutes);
  await app.register(dashboardRoutes);
  await app.register(settingsRoutes);

  // Local plugins extend the API last.
  await pluginRegistry.registerRoutes(app);

  return app;
}

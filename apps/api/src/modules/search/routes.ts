import type { FastifyInstance } from "fastify";
import { searchQuerySchema } from "@studio-os/shared";
import { searchService } from "./service.js";

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/search", { onRequest: [app.authenticate] }, async (req) => {
    const parsed = searchQuerySchema.parse({
      ...(req.query as Record<string, unknown>),
      types: (req.query as { types?: string }).types?.toString().split(",").filter(Boolean),
    });
    return searchService.search(parsed);
  });
}

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { prisma } from "./lib/prisma.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  app.log.info(`Studio OS API listening on ${config.API_HOST}:${config.API_PORT}`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

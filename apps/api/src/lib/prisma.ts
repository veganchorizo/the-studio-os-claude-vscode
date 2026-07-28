import { PrismaClient } from "@prisma/client";

/** Single shared Prisma client (connection pooling handled by the driver). */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export type Prisma = typeof prisma;

import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.IS_DEVELOPMENT
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
    errorFormat: env.IS_PRODUCTION ? "minimal" : "pretty",
  });

if (!env.IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}

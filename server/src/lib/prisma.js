import { PrismaClient } from "@prisma/client";
import { env, logger } from "../config/index.js";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.IS_DEVELOPMENT ? ["warn", "error"] : ["warn", "error"],
    errorFormat: env.IS_PRODUCTION ? "minimal" : "pretty",
  });

if (!env.IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}

export async function connectWithRetry(maxRetries = 3, delay = 1500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      logger.info("Connected to Neon PostgreSQL database");
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${maxRetries} failed`, {
        error: error.message,
      });
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
}

export async function disconnect() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.warn("Error disconnecting database", { error: error.message });
  }
}

prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    if (
      error.message?.includes("connection") &&
      (error.message?.includes("Closed") || error.message?.includes("closed") || error.message?.includes("terminated"))
    ) {
      logger.warn("DB connection lost, reconnecting...", { model: params.model, action: params.action });
      try { await prisma.$disconnect(); } catch {}
      await new Promise((r) => setTimeout(r, 500));
      try {
        await prisma.$connect();
        logger.info("DB reconnected OK");
        return await next(params);
      } catch (re) {
        logger.error("DB reconnect failed", { error: re.message });
      }
    }
    throw error;
  }
});

process.on("beforeExit", () => disconnect());

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down DB`);
    await disconnect();
    process.exit(0);
  });
});

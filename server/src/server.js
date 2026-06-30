import http from "http";
import app from "./app.js";
import { env, logger } from "./config/index.js";
import { prisma, connectWithRetry } from "./lib/prisma.js";
import { initSocket } from "./lib/socket.js";
import { initDocker } from "./lib/docker.js";
import { initAi } from "./lib/ai.js";

const startServer = async () => {
  try {
    await connectWithRetry();

    initDocker();
    initAi();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.PORT, () => {
      logger.info(`NexIDE server started on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        port: env.PORT,
        url: `http://localhost:${env.PORT}`,
      });

      if (env.IS_DEVELOPMENT) {
        logger.info(`API available at http://localhost:${env.PORT}/api/v1`);
      }
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info("HTTP server closed");
        await prisma.$disconnect();
        logger.info("Database connection closed");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection:", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", {
        message: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server:", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

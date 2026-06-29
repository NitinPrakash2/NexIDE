import { prisma } from "../lib/prisma.js";
import { dockerAvailable, checkDocker } from "../lib/docker.js";
import { aiAvailable } from "../lib/ai.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

export const healthCheck = asyncHandler(async (req, res) => {
  let dbStatus = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "error";
  }

  const dockerStatus = dockerAvailable() ? (await checkDocker() ? "available" : "unreachable") : "unavailable";
  const aiStatus = aiAvailable() ? "configured" : "not_configured";

  const healthData = {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    requestId: req.id,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
    },
    components: {
      database: dbStatus,
      docker: dockerStatus,
      ai: aiStatus,
    },
  };

  const statusCode = dbStatus === "connected" ? 200 : 503;
  ApiResponse.success(statusCode, "Server is running", healthData).send(res);
});

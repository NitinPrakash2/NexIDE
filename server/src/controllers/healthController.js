import { asyncHandler, ApiResponse } from "../utils/index.js";

export const healthCheck = asyncHandler(async (req, res) => {
  const healthData = {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  };

  ApiResponse.ok("Server is running", healthData).send(res);
});

import { ActivityLogService } from "../services/activityLogService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const activityLogService = new ActivityLogService();

export const listActivity = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await activityLogService.list(req.params.projectId, req.user.id, page, limit);
  ApiResponse.ok("Activity log fetched", result).send(res);
});

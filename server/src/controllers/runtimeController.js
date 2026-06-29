import { RuntimeService } from "../services/runtimeService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";

const runtimeService = new RuntimeService();

export const listContainers = asyncHandler(async (req, res) => {
  const containers = await runtimeService.list(req.params.projectId, req.user.id);
  ApiResponse.ok("Containers fetched", containers).send(res);
});

export const getContainer = asyncHandler(async (req, res) => {
  const container = await runtimeService.getById(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Container fetched", container).send(res);
});

export const createContainer = asyncHandler(async (req, res) => {
  const container = await runtimeService.create(req.params.projectId, req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "Container created", container).send(res);
});

export const startContainer = asyncHandler(async (req, res) => {
  const container = await runtimeService.start(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Container started", container).send(res);
});

export const stopContainer = asyncHandler(async (req, res) => {
  const container = await runtimeService.stop(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Container stopped", container).send(res);
});

export const updateContainer = asyncHandler(async (req, res) => {
  const container = await runtimeService.update(req.params.projectId, req.params.containerId, req.user.id, req.body);
  ApiResponse.ok("Container updated", container).send(res);
});

export const deleteContainer = asyncHandler(async (req, res) => {
  await runtimeService.delete(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Container deleted").send(res);
});

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await runtimeService.getLogs(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Container logs fetched", { logs: logs.toString("utf-8") }).send(res);
});

export const getPreviewUrl = asyncHandler(async (req, res) => {
  const result = await runtimeService.getPreviewUrl(req.params.projectId, req.params.containerId, req.user.id);
  ApiResponse.ok("Preview URL fetched", result).send(res);
});

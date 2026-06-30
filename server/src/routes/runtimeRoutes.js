import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { containerRateLimiter } from "../config/rateLimiter.js";
import { createContainerSchema, updateContainerSchema, containerIdParamSchema } from "../validators/runtimeValidator.js";
import { projectIdParamSchema } from "../validators/fileValidator.js";
import * as runtimeController from "../controllers/runtimeController.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", validate(projectIdParamSchema, "params"), runtimeController.listContainers);
router.post("/", containerRateLimiter, validate(projectIdParamSchema, "params"), validate(createContainerSchema), runtimeController.createContainer);
router.get("/:containerId", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.getContainer);
router.post("/:containerId/start", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.startContainer);
router.post("/:containerId/stop", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.stopContainer);
router.patch("/:containerId", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), validate(updateContainerSchema), runtimeController.updateContainer);
router.delete("/:containerId", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.deleteContainer);
router.get("/:containerId/logs", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.getLogs);
router.get("/:containerId/preview", validate(projectIdParamSchema, "params"), validate(containerIdParamSchema, "params"), runtimeController.getPreviewUrl);

export default router;

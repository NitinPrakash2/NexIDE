import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { createContainerSchema, updateContainerSchema } from "../validators/runtimeValidator.js";
import * as runtimeController from "../controllers/runtimeController.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", runtimeController.listContainers);
router.post("/", validate(createContainerSchema), runtimeController.createContainer);
router.get("/:containerId", runtimeController.getContainer);
router.post("/:containerId/start", runtimeController.startContainer);
router.post("/:containerId/stop", runtimeController.stopContainer);
router.patch("/:containerId", validate(updateContainerSchema), runtimeController.updateContainer);
router.delete("/:containerId", runtimeController.deleteContainer);
router.get("/:containerId/logs", runtimeController.getLogs);
router.get("/:containerId/preview", runtimeController.getPreviewUrl);

export default router;

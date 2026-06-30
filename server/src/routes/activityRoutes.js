import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { listActivity } from "../controllers/activityController.js";
import { activityQuerySchema } from "../validators/activityValidator.js";
import { projectIdParamSchema } from "../validators/fileValidator.js";

const router = Router();

router.get("/:projectId/activity", authenticate, validate(projectIdParamSchema, "params"), validate(activityQuerySchema, "query"), listActivity);

export default router;

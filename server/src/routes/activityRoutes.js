import { Router } from "express";
import { authenticate } from "../middlewares/index.js";
import { listActivity } from "../controllers/activityController.js";

const router = Router();

router.get("/:projectId/activity", authenticate, listActivity);

export default router;

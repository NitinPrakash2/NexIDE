import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { notificationQuerySchema, notificationIdParamSchema } from "../validators/notificationValidator.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(notificationQuerySchema, "query"), notificationController.listNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", validate(notificationIdParamSchema, "params"), notificationController.markAsRead);
router.patch("/read-all", notificationController.markAllAsRead);
router.delete("/:id", validate(notificationIdParamSchema, "params"), notificationController.deleteNotification);

export default router;

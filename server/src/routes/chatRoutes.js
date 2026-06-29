import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import { sendMessageSchema, chatQuerySchema } from "../validators/chatValidator.js";
import * as chatController from "../controllers/chatController.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", validate(chatQuerySchema, "query"), chatController.getHistory);
router.post("/", validate(sendMessageSchema), chatController.sendMessage);

export default router;

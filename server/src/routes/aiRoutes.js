import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import {
  chatMessageSchema,
  codeActionSchema,
  createConversationSchema,
  updateConversationSchema,
} from "../validators/aiValidator.js";
import * as aiController from "../controllers/aiController.js";

const router = Router();

router.use(authenticate);

// Conversation CRUD
router.get("/conversations", aiController.listConversations);
router.post("/conversations", validate(createConversationSchema), aiController.createConversation);
router.get("/conversations/:id", aiController.getConversation);
router.patch("/conversations/:id", validate(updateConversationSchema), aiController.updateConversation);
router.delete("/conversations/:id", aiController.deleteConversation);

// AI Actions
router.post("/chat", validate(chatMessageSchema), aiController.chat);
router.post("/chat/stream", validate(chatMessageSchema), aiController.chatStream);
router.post("/generate", validate(codeActionSchema), aiController.generate);
router.post("/explain", validate(codeActionSchema), aiController.explain);
router.post("/refactor", validate(codeActionSchema), aiController.refactor);
router.post("/debug", validate(codeActionSchema), aiController.debug);

export default router;

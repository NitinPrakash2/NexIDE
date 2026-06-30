import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.js";
import {
  chatMessageSchema,
  codeActionSchema,
  createConversationSchema,
  updateConversationSchema,
  conversationIdParamSchema,
  conversationQuerySchema,
} from "../validators/aiValidator.js";
import * as aiController from "../controllers/aiController.js";

const router = Router();

router.use(authenticate);

// Conversation CRUD
router.get("/conversations", validate(conversationQuerySchema, "query"), aiController.listConversations);
router.post("/conversations", validate(createConversationSchema), aiController.createConversation);
router.get("/conversations/:id", validate(conversationIdParamSchema, "params"), aiController.getConversation);
router.patch("/conversations/:id", validate(conversationIdParamSchema, "params"), validate(updateConversationSchema), aiController.updateConversation);
router.delete("/conversations/:id", validate(conversationIdParamSchema, "params"), aiController.deleteConversation);

// AI Actions
router.post("/chat", validate(chatMessageSchema), aiController.chat);
router.post("/chat/stream", validate(chatMessageSchema), aiController.chatStream);
router.post("/generate", validate(codeActionSchema), aiController.generate);
router.post("/explain", validate(codeActionSchema), aiController.explain);
router.post("/refactor", validate(codeActionSchema), aiController.refactor);
router.post("/debug", validate(codeActionSchema), aiController.debug);

// Code Index
router.get("/code-index", aiController.getCodeIndexStats);
router.post("/code-index/reindex", aiController.reindexCode);

export default router;

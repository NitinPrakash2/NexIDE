import { AiService } from "../services/aiService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";
import { logger } from "../config/index.js";
import { getIndexStats, clearProjectIndex } from "../lib/codeIndexer.js";

const aiService = new AiService();

// --- Conversation CRUD ---

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await aiService.listConversations(req.user.id, req.query.projectId);
  ApiResponse.ok("Conversations fetched", conversations).send(res);
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.getConversation(req.params.id, req.user.id);
  ApiResponse.ok("Conversation fetched", conversation).send(res);
});

export const createConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.createConversation(req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "Conversation created", conversation).send(res);
});

export const updateConversation = asyncHandler(async (req, res) => {
  const conversation = await aiService.updateConversation(req.params.id, req.user.id, req.body);
  ApiResponse.ok("Conversation updated", conversation).send(res);
});

export const deleteConversation = asyncHandler(async (req, res) => {
  await aiService.deleteConversation(req.params.id, req.user.id);
  ApiResponse.ok("Conversation deleted").send(res);
});

// --- AI Actions ---

export const chat = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, {
    conversationId: req.body.conversationId,
    message: req.body.message,
    projectId: req.body.projectId,
    type: "chat",
  });
  ApiResponse.ok("AI response generated", result).send(res);
});

export const generate = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, {
    conversationId: req.body.conversationId,
    projectId: req.body.projectId,
    type: "generate",
    code: req.body.code,
    language: req.body.language,
  });
  ApiResponse.ok("Code generated", result).send(res);
});

export const explain = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, {
    conversationId: req.body.conversationId,
    projectId: req.body.projectId,
    type: "explain",
    code: req.body.code,
    language: req.body.language,
  });
  ApiResponse.ok("Code explained", result).send(res);
});

export const refactor = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, {
    conversationId: req.body.conversationId,
    projectId: req.body.projectId,
    type: "refactor",
    code: req.body.code,
    language: req.body.language,
  });
  ApiResponse.ok("Code refactoring suggested", result).send(res);
});

export const debug = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, {
    conversationId: req.body.conversationId,
    projectId: req.body.projectId,
    type: "debug",
    code: req.body.code,
    language: req.body.language,
    errorMessage: req.body.errorMessage,
  });
  ApiResponse.ok("Debug analysis provided", result).send(res);
});

// --- SSE Streaming Chat ---

export const chatStream = asyncHandler(async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

  try {
    const stream = aiService.chatStream(req.user.id, {
      conversationId: req.body.conversationId,
      message: req.body.message,
      projectId: req.body.projectId,
      type: "chat",
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      if (chunk.done) break;
    }
  } catch (error) {
    logger.error("AI stream error", { error: error.message });
    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export const getCodeIndexStats = asyncHandler(async (req, res) => {
  const stats = getIndexStats(req.query.projectId);
  ApiResponse.ok("Code index stats", stats).send(res);
});

export const reindexCode = asyncHandler(async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) {
    return res.status(422).json({ success: false, message: "projectId is required" });
  }
  clearProjectIndex(projectId);
  const { indexProject } = await import("../lib/codeIndexer.js");
  await indexProject(projectId);
  const stats = getIndexStats(projectId);
  ApiResponse.ok("Project re-indexed", stats).send(res);
});

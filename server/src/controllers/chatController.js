import { ChatService } from "../services/chatService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";

const chatService = new ChatService();

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.params.projectId, req.user.id, req.body.message);
  ApiResponse.success(HTTP_STATUS.CREATED, "Message sent", message).send(res);
});

export const getHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const history = await chatService.getHistory(req.params.projectId, req.user.id, page, limit);
  ApiResponse.ok("Chat history fetched", history).send(res);
});

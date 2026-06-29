import { ChatRepository } from "../repositories/chatRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { AppError } from "../utils/appError.js";

const chatRepository = new ChatRepository();
const memberRepository = new MemberRepository();

export class ChatService {
  async sendMessage(projectId, userId, message) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) throw AppError.forbidden("You are not a member of this project");

    const chatMessage = await chatRepository.create({
      projectId,
      userId,
      message,
    });

    await chatRepository.deleteOldMessages(projectId);

    return chatMessage;
  }

  async getHistory(projectId, userId, page = 1, limit = 50) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) throw AppError.forbidden("You are not a member of this project");

    return chatRepository.findByProject(projectId, page, limit);
  }
}

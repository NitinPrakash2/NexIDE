import { prisma } from "../lib/prisma.js";

export class AiMessageRepository {
  async create(data) {
    return prisma.aiMessage.create({ data });
  }

  async findByConversation(conversationId) {
    return prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }
}

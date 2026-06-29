import { prisma } from "../lib/prisma.js";

export class ChatRepository {
  async create(data) {
    return prisma.chatMessage.create({ data, include: { user: { select: { id: true, fullName: true, username: true, avatar: true } } } });
  }

  async findByProject(projectId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { projectId },
        include: { user: { select: { id: true, fullName: true, username: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.chatMessage.count({ where: { projectId } }),
    ]);
    return { messages: messages.reverse(), total, page, limit };
  }

  async deleteOldMessages(projectId, keepCount = 1000) {
    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip: keepCount,
      select: { id: true },
    });
    if (messages.length === 0) return 0;
    const ids = messages.map((m) => m.id);
    return prisma.chatMessage.deleteMany({ where: { id: { in: ids } } });
  }
}

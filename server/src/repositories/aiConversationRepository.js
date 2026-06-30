import { prisma } from "../lib/prisma.js";

export class AiConversationRepository {
  async create(data) {
    return prisma.aiConversation.create({ data });
  }

  async findByUser(userId, projectId) {
    const where = { userId };
    if (projectId) where.projectId = projectId;
    return prisma.aiConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findById(id) {
    return prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  async update(id, data) {
    return prisma.aiConversation.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.aiConversation.delete({ where: { id } });
  }

  async touch(id) {
    return prisma.aiConversation.update({ where: { id }, data: { updatedAt: new Date() } });
  }
}

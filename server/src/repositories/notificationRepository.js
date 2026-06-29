import { prisma } from "../lib/prisma.js";

export class NotificationRepository {
  async create(data) {
    return prisma.notification.create({ data });
  }

  async findByUser(userId, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, username: true, avatar: true } },
          project: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications, total, unreadCount, page, limit };
  }

  async findById(id) {
    return prisma.notification.findUnique({ where: { id } });
  }

  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id, userId) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async getUnreadCount(userId) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }
}

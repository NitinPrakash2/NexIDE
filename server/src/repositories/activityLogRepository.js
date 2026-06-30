import { prisma } from "../lib/prisma.js";

export class ActivityLogRepository {
  async create(data) {
    return prisma.activityLog.create({ data });
  }

  async findByProject(projectId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, fullName: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { projectId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

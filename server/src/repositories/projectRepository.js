import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

const projectInclude = {
  owner: {
    select: {
      id: true,
      fullName: true,
      username: true,
      avatar: true,
    },
  },
  workspace: true,
  members: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
          email: true,
        },
      },
    },
  },
};

export class ProjectRepository {
  async create(data) {
    return prisma.project.create({
      data,
      include: projectInclude,
    });
  }

  async findById(id, includeOwner = true) {
    return prisma.project.findUnique({
      where: { id },
      include: includeOwner ? projectInclude : undefined,
    });
  }

  async findBySlug(ownerId, slug) {
    return prisma.project.findUnique({
      where: { ownerId_slug: { ownerId, slug } },
      include: projectInclude,
    });
  }

  async findMany(ownerId, query) {
    const where = { ownerId, deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.language) where.language = query.language;
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;

    const orderBy = this._parseSort(query.sort);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total, page: query.page, limit: query.limit };
  }

  async updateById(id, data) {
    return prisma.project.update({
      where: { id },
      data,
      include: projectInclude,
    });
  }

  async softDelete(id) {
    return prisma.project.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
  }

  async permanentDelete(id) {
    return prisma.project.delete({ where: { id } });
  }

  async updateLastOpened(id) {
    return prisma.project.update({
      where: { id },
      data: { lastOpenedAt: new Date() },
    });
  }

  async getRecent(ownerId, limit = 10) {
    return prisma.project.findMany({
      where: { ownerId, status: "ACTIVE", deletedAt: null },
      orderBy: { lastOpenedAt: "desc" },
      take: limit,
      include: projectInclude,
    });
  }

  async addFavorite(userId, projectId) {
    return prisma.userFavorite.create({ data: { userId, projectId } });
  }

  async removeFavorite(userId, projectId) {
    return prisma.userFavorite.delete({
      where: { userId_projectId: { userId, projectId } },
    });
  }

  async getFavorites(userId) {
    return prisma.userFavorite.findMany({
      where: { userId },
      include: {
        project: {
          include: projectInclude,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async isFavorite(userId, projectId) {
    const fav = await prisma.userFavorite.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return !!fav;
  }

  async findFavoritesByUser(userId, query) {
    const where = { userId };

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));

    const favorites = await prisma.userFavorite.findMany({
      where,
      include: {
        project: {
          include: projectInclude,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.userFavorite.count({ where });

    return {
      favorites: favorites.map((f) => ({ ...f.project, favoritedAt: f.createdAt })),
      total,
      page,
      limit,
    };
  }

  async countByOwner(ownerId) {
    return prisma.project.count({
      where: { ownerId, deletedAt: null, status: { not: "DELETED" } },
    });
  }

  _parseSort(sort) {
    const validFields = ["name", "createdAt", "updatedAt", "lastOpenedAt"];
    const parts = sort.split(",");
    return parts.map((part) => {
      const desc = part.startsWith("-");
      const field = desc ? part.slice(1) : part;
      if (!validFields.includes(field)) return { updatedAt: "desc" };
      return { [field]: desc ? "desc" : "asc" };
    });
  }
}

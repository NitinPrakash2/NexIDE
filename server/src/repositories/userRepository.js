import { prisma } from "../lib/prisma.js";

export class UserRepository {
  async create(data) {
    return prisma.user.create({ data });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { preferences: true },
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByProvider(provider, providerId) {
    return prisma.user.findFirst({
      where: { provider, providerId },
    });
  }

  async updateById(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async updateRefreshToken(id, refreshToken) {
    return prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async softDelete(id) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), refreshToken: null },
    });
  }

  async findActiveById(id) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { preferences: true },
    });
  }

  async findActiveByUsername(username) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async upsertPreferences(userId, data) {
    return prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async getPreferences(userId) {
    return prisma.userPreference.findUnique({ where: { userId } });
  }
}

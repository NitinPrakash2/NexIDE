import { prisma } from "../lib/prisma.js";

const memberInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      username: true,
      avatar: true,
      email: true,
    },
  },
};

export class MemberRepository {
  async findByProjectId(projectId) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: memberInclude,
      orderBy: { joinedAt: "asc" },
    });
  }

  async findById(id) {
    return prisma.projectMember.findUnique({
      where: { id },
      include: memberInclude,
    });
  }

  async findByProjectAndUser(projectId, userId) {
    return prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async create(data) {
    return prisma.projectMember.create({
      data,
      include: memberInclude,
    });
  }

  async updateRole(id, role) {
    return prisma.projectMember.update({
      where: { id },
      data: { role },
      include: memberInclude,
    });
  }

  async delete(id) {
    return prisma.projectMember.delete({ where: { id } });
  }

  async countByProject(projectId) {
    return prisma.projectMember.count({ where: { projectId } });
  }

  async getOwner(projectId) {
    return prisma.projectMember.findFirst({
      where: { projectId, role: "OWNER" },
      include: memberInclude,
    });
  }
}

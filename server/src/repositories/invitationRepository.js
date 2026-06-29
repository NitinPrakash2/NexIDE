import { prisma } from "../lib/prisma.js";

const invitationInclude = {
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  inviter: {
    select: {
      id: true,
      fullName: true,
      username: true,
      avatar: true,
    },
  },
};

export class InvitationRepository {
  async create(data) {
    return prisma.invitation.create({
      data,
      include: invitationInclude,
    });
  }

  async findByToken(token) {
    return prisma.invitation.findUnique({
      where: { token },
      include: invitationInclude,
    });
  }

  async findPendingByProjectAndEmail(projectId, email) {
    return prisma.invitation.findFirst({
      where: {
        projectId,
        email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findPendingByProject(projectId) {
    return prisma.invitation.findMany({
      where: {
        projectId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id, status, acceptedBy = null) {
    return prisma.invitation.update({
      where: { id },
      data: {
        status,
        ...(acceptedBy ? { acceptedBy } : {}),
      },
    });
  }

  async expireOld() {
    return prisma.invitation.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  }
}

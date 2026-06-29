import { prisma } from "../lib/prisma.js";

export class WorkspaceRepository {
  async findByProjectId(projectId) {
    return prisma.workspace.findUnique({
      where: { projectId },
    });
  }

  async updateByProjectId(projectId, data) {
    return prisma.workspace.update({
      where: { projectId },
      data,
    });
  }
}

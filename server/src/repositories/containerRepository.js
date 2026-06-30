import { prisma } from "../lib/prisma.js";

export class ContainerRepository {
  async findByProject(projectId) {
    return prisma.container.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  }

  async findById(id) {
    return prisma.container.findUnique({ where: { id } });
  }

  async create(data) {
    return prisma.container.create({ data });
  }

  async update(id, data) {
    return prisma.container.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.container.delete({ where: { id } });
  }
}

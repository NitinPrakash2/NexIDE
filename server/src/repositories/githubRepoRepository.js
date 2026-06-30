import { prisma } from "../lib/prisma.js";

export class GithubRepoRepository {
  async findByProject(projectId) {
    return prisma.githubRepo.findUnique({ where: { projectId } });
  }

  async create(data) {
    return prisma.githubRepo.create({ data });
  }

  async update(projectId, data) {
    return prisma.githubRepo.update({ where: { projectId }, data });
  }

  async delete(projectId) {
    return prisma.githubRepo.delete({ where: { projectId } });
  }
}

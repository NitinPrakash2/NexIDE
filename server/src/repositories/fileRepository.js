import { prisma } from "../lib/prisma.js";

export class FileRepository {
  async createFolder(data) {
    return prisma.folder.create({ data });
  }

  async findFolderById(id) {
    return prisma.folder.findUnique({ where: { id } });
  }

  async findFolderByPath(projectId, path) {
    return prisma.folder.findUnique({
      where: { projectId_path: { projectId, path } },
    });
  }

  async updateFolder(id, data) {
    return prisma.folder.update({ where: { id }, data });
  }

  async deleteFolder(id) {
    return prisma.folder.delete({ where: { id } });
  }

  async getFolderTree(projectId) {
    const folders = await prisma.folder.findMany({
      where: { projectId },
      orderBy: { path: "asc" },
    });
    const files = await prisma.file.findMany({
      where: { projectId },
      orderBy: { path: "asc" },
    });
    return { folders, files };
  }

  async createFile(data) {
    return prisma.file.create({ data });
  }

  async findFileById(id) {
    return prisma.file.findUnique({ where: { id } });
  }

  async findFileByPath(projectId, path) {
    return prisma.file.findUnique({
      where: { projectId_path: { projectId, path } },
    });
  }

  async updateFile(id, data) {
    return prisma.file.update({ where: { id }, data });
  }

  async deleteFile(id) {
    return prisma.file.delete({ where: { id } });
  }

  async countFilesInFolder(folderId) {
    return prisma.file.count({ where: { folderId } });
  }

  async countSubfolders(folderId) {
    return prisma.folder.count({ where: { parentId: folderId } });
  }
}

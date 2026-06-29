import { prisma } from "../lib/prisma.js";
import { FileRepository } from "../repositories/fileRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const fileRepository = new FileRepository();
const memberRepository = new MemberRepository();

const WRITABLE_ROLES = ["OWNER", "ADMIN", "EDITOR"];

async function guardMember(projectId, userId) {
  const membership = await memberRepository.findByProjectAndUser(projectId, userId);
  if (!membership) throw AppError.forbidden("You are not a member of this project");
  return membership;
}

async function guardWrite(projectId, userId) {
  const membership = await guardMember(projectId, userId);
  if (!WRITABLE_ROLES.includes(membership.role)) {
    throw AppError.forbidden("You do not have permission to modify files");
  }
  return membership;
}

function generatePath(projectId, name, parentPath) {
  return parentPath ? `${parentPath}/${name}` : name;
}

function splitExtension(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { name: filename, ext: "" };
  return { name: filename.slice(0, dot), ext: filename.slice(dot + 1) };
}

export class FileService {
  async getTree(projectId, userId) {
    await guardMember(projectId, userId);
    return fileRepository.getFolderTree(projectId);
  }

  async createFolder(projectId, userId, { name, parentId }) {
    await guardWrite(projectId, userId);

    let parentPath = "";
    if (parentId) {
      const parent = await fileRepository.findFolderById(parentId);
      if (!parent || parent.projectId !== projectId) {
        throw AppError.notFound("Parent folder not found");
      }
      parentPath = parent.path;
    }

    const path = generatePath(projectId, name, parentPath);

    const existing = await fileRepository.findFolderByPath(projectId, path);
    if (existing) {
      throw AppError.conflict("A folder with this name already exists at this location");
    }

    const folder = await fileRepository.createFolder({
      name,
      path,
      projectId,
      parentId: parentId || null,
    });

    log.info("Folder created", { projectId, folderId: folder.id, path });
    return folder;
  }

  async renameFolder(projectId, userId, folderId, { name }) {
    await guardWrite(projectId, userId);

    const folder = await fileRepository.findFolderById(folderId);
    if (!folder || folder.projectId !== projectId) {
      throw AppError.notFound("Folder not found");
    }

    const oldPath = folder.path;
    const parentPath = oldPath.includes("/")
      ? oldPath.slice(0, oldPath.lastIndexOf("/"))
      : "";
    const newPath = generatePath(projectId, name, parentPath);

    const existing = await fileRepository.findFolderByPath(projectId, newPath);
    if (existing && existing.id !== folderId) {
      throw AppError.conflict("A folder with this name already exists at this location");
    }

    const updated = await fileRepository.updateFolder(folderId, {
      name,
      path: newPath,
    });

    log.info("Folder renamed", { projectId, folderId, oldPath, newPath });
    return updated;
  }

  async deleteFolder(projectId, userId, folderId) {
    await guardWrite(projectId, userId);

    const folder = await fileRepository.findFolderById(folderId);
    if (!folder || folder.projectId !== projectId) {
      throw AppError.notFound("Folder not found");
    }

    const children = await this._getDescendantFolders(folderId);
    const allFolderIds = [folderId, ...children.map((f) => f.id)];

    for (const id of allFolderIds) {
      const fileCount = await fileRepository.countFilesInFolder(id);
      if (fileCount > 0) {
        await prisma.file.deleteMany({ where: { folderId: id } });
      }
    }

    const reverseIds = [...allFolderIds].reverse();
    for (const id of reverseIds) {
      await fileRepository.deleteFolder(id);
    }

    log.info("Folder deleted", { projectId, folderId, path: folder.path });
  }

  async createFile(projectId, userId, { name, folderId, content }) {
    await guardWrite(projectId, userId);

    let parentPath = "";
    if (folderId) {
      const folder = await fileRepository.findFolderById(folderId);
      if (!folder || folder.projectId !== projectId) {
        throw AppError.notFound("Parent folder not found");
      }
      parentPath = folder.path;
    }

    const path = generatePath(projectId, name, parentPath);
    const { ext } = splitExtension(name);

    const existing = await fileRepository.findFileByPath(projectId, path);
    if (existing) {
      throw AppError.conflict("A file with this name already exists at this location");
    }

    const file = await fileRepository.createFile({
      name,
      extension: ext,
      path,
      content: content || "",
      size: (content || "").length,
      projectId,
      folderId: folderId || null,
    });

    log.info("File created", { projectId, fileId: file.id, path });
    return file;
  }

  async getFile(projectId, userId, fileId) {
    await guardMember(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }
    return file;
  }

  async updateFile(projectId, userId, fileId, data) {
    await guardWrite(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    const updateData = { ...data };
    if (data.content !== undefined) {
      updateData.size = data.content.length;
    }

    const updated = await fileRepository.updateFile(fileId, updateData);
    log.info("File updated", { projectId, fileId });
    return updated;
  }

  async renameFile(projectId, userId, fileId, { name }) {
    await guardWrite(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    const oldPath = file.path;
    const parentPath = oldPath.includes("/")
      ? oldPath.slice(0, oldPath.lastIndexOf("/"))
      : "";
    const newPath = generatePath(projectId, name, parentPath);
    const { ext } = splitExtension(name);

    const existing = await fileRepository.findFileByPath(projectId, newPath);
    if (existing && existing.id !== fileId) {
      throw AppError.conflict("A file with this name already exists at this location");
    }

    const updated = await fileRepository.updateFile(fileId, {
      name,
      extension: ext,
      path: newPath,
    });

    log.info("File renamed", { projectId, fileId, oldPath, newPath });
    return updated;
  }

  async deleteFile(projectId, userId, fileId) {
    await guardWrite(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    await fileRepository.deleteFile(fileId);
    log.info("File deleted", { projectId, fileId, path: file.path });
  }

  async _getDescendantFolders(folderId) {
    const all = [];
    const queue = [folderId];
    while (queue.length > 0) {
      const current = queue.shift();
      const children = await prisma.folder.findMany({
        where: { parentId: current },
      });
      for (const child of children) {
        all.push(child);
        queue.push(child.id);
      }
    }
    return all;
  }
}

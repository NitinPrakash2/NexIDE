import { prisma } from "../lib/prisma.js";
import { FileRepository } from "../repositories/fileRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { NotificationService } from "./notificationService.js";
import { ActivityLogService } from "./activityLogService.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const fileRepository = new FileRepository();
const memberRepository = new MemberRepository();
const notificationService = new NotificationService();
const activityLogService = new ActivityLogService();

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

    await activityLogService.log(projectId, userId, "FOLDER_CREATED", `Created folder ${path}`);

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

    await activityLogService.log(projectId, userId, "FILE_CREATED", `Created file ${path}`);

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

    if (data.content !== undefined) {
      const members = await memberRepository.findByProjectId(projectId);
      const others = members.filter((m) => m.userId !== userId);
      for (const m of others) {
        await notificationService.create({
          userId: m.userId,
          type: "FILE_EDITED",
          title: "File edited",
          message: `${updated.name} was edited`,
          projectId,
          actorId: userId,
          data: { fileId: updated.id, fileName: updated.name, filePath: updated.path },
        }).catch(() => {});
      }
      await activityLogService.log(projectId, userId, "FILE_UPDATED", `Updated file ${updated.path}`);
    }

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
    await activityLogService.log(projectId, userId, "FILE_DELETED", `Deleted file ${file.path}`);
    log.info("File deleted", { projectId, fileId, path: file.path });
  }

  async moveFile(projectId, userId, fileId, { folderId }) {
    await guardWrite(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    let parentPath = "";
    if (folderId) {
      const folder = await fileRepository.findFolderById(folderId);
      if (!folder || folder.projectId !== projectId) {
        throw AppError.notFound("Destination folder not found");
      }
      parentPath = folder.path;
    }

    const newPath = parentPath ? `${parentPath}/${file.name}` : file.name;
    const existing = await fileRepository.findFileByPath(projectId, newPath);
    if (existing && existing.id !== fileId) {
      throw AppError.conflict("A file with this name already exists at the destination");
    }

    const updated = await fileRepository.updateFile(fileId, {
      folderId: folderId || null,
      path: newPath,
    });

    await activityLogService.log(projectId, userId, "FILE_MOVED",
      `Moved file ${file.path} to ${newPath}`);

    log.info("File moved", { projectId, fileId, oldPath: file.path, newPath });
    return updated;
  }

  async copyFile(projectId, userId, fileId, { folderId, name }) {
    await guardWrite(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    let parentPath = "";
    if (folderId) {
      const folder = await fileRepository.findFolderById(folderId);
      if (!folder || folder.projectId !== projectId) {
        throw AppError.notFound("Destination folder not found");
      }
      parentPath = folder.path;
    }

    const newName = name || `${file.name.replace(/\.[^.]+$/, "")}-copy.${file.extension}`;
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    const { ext } = splitExtension(newName);

    const existing = await fileRepository.findFileByPath(projectId, newPath);
    if (existing) {
      throw AppError.conflict("A file with this name already exists at the destination");
    }

    const copied = await fileRepository.createFile({
      name: newName,
      extension: ext,
      path: newPath,
      content: file.content || "",
      size: file.content?.length || 0,
      projectId,
      folderId: folderId || null,
    });

    await activityLogService.log(projectId, userId, "FILE_COPIED",
      `Copied file ${file.path} to ${newPath}`);

    log.info("File copied", { projectId, fileId, newPath });
    return copied;
  }

  async uploadFile(projectId, userId, { name, folderId, content, mimeType }) {
    await guardWrite(projectId, userId);

    let parentPath = "";
    if (folderId) {
      const folder = await fileRepository.findFolderById(folderId);
      if (!folder || folder.projectId !== projectId) {
        throw AppError.notFound("Destination folder not found");
      }
      parentPath = folder.path;
    }

    const filePath = parentPath ? `${parentPath}/${name}` : name;
    const { ext } = splitExtension(name);

    const existing = await fileRepository.findFileByPath(projectId, filePath);
    if (existing) {
      throw AppError.conflict("A file with this name already exists at this location");
    }

    const file = await fileRepository.createFile({
      name,
      extension: ext,
      path: filePath,
      content: typeof content === "string" ? content : (content || ""),
      size: Buffer.byteLength(typeof content === "string" ? content : (content || ""), "utf-8"),
      mimeType: mimeType || null,
      projectId,
      folderId: folderId || null,
    });

    await activityLogService.log(projectId, userId, "FILE_CREATED", `Uploaded file ${filePath}`);

    log.info("File uploaded", { projectId, fileId: file.id, path: filePath });
    return file;
  }

  async downloadFile(projectId, userId, fileId) {
    await guardMember(projectId, userId);

    const file = await fileRepository.findFileById(fileId);
    if (!file || file.projectId !== projectId) {
      throw AppError.notFound("File not found");
    }

    return file;
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

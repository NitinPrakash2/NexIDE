import { prisma } from "../lib/prisma.js";
import { ProjectRepository } from "../repositories/projectRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { slugify } from "../validators/projectValidator.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const projectRepository = new ProjectRepository();
const memberRepository = new MemberRepository();

export class ProjectService {
  async create(ownerId, data) {
    let slug = data.slug || slugify(data.name);

    const existing = await projectRepository.findBySlug(ownerId, slug);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const project = await projectRepository.create({
      name: data.name,
      slug,
      description: data.description || null,
      icon: data.icon || null,
      color: data.color || null,
      language: data.language || "javascript",
      framework: data.framework || null,
      visibility: data.visibility || "PRIVATE",
      ownerId,
    });

    await prisma.workspace.create({
      data: {
        projectId: project.id,
        name: data.name,
      },
    });

    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: "OWNER",
      },
    });

    log.info("Project created", { projectId: project.id, ownerId });
    return project;
  }

  async _guardAccess(projectId, userId) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) throw AppError.forbidden("You do not have access to this project");
    return membership;
  }

  async _guardWrite(projectId, userId) {
    const membership = await this._guardAccess(projectId, userId);
    if (!["OWNER", "ADMIN", "EDITOR"].includes(membership.role)) {
      throw AppError.forbidden("You do not have permission to modify this project");
    }
    return membership;
  }

  async _guardManager(projectId, userId) {
    const membership = await this._guardAccess(projectId, userId);
    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      throw AppError.forbidden("Only managers can perform this action");
    }
    return membership;
  }

  async getById(projectId, userId) {
    const project = await projectRepository.findById(projectId);
    if (!project || project.deletedAt) {
      throw AppError.notFound("Project not found");
    }
    await this._guardAccess(projectId, userId);
    return project;
  }

  async getMyProjects(userId, query) {
    return projectRepository.findMany(userId, query);
  }

  async update(projectId, userId, data) {
    const project = await this.getById(projectId, userId);
    if (project.status === "DELETED") {
      throw AppError.badRequest("Cannot update a deleted project");
    }

    const updated = await projectRepository.updateById(projectId, data);
    log.info("Project updated", { projectId, ownerId: userId });
    return updated;
  }

  async archive(projectId, userId) {
    const project = await this.getById(projectId, userId);
    if (project.status === "ARCHIVED") {
      throw AppError.badRequest("Project is already archived");
    }
    if (project.status === "DELETED") {
      throw AppError.badRequest("Cannot archive a deleted project");
    }

    const updated = await projectRepository.updateById(projectId, {
      status: "ARCHIVED",
    });
    log.info("Project archived", { projectId, ownerId: userId });
    return updated;
  }

  async restore(projectId, userId) {
    await this._guardManager(projectId, userId);
    const project = await projectRepository.findById(projectId);
    if (!project) throw AppError.notFound("Project not found");
    if (project.status !== "ARCHIVED") {
      throw AppError.badRequest("Project is not archived");
    }

    const updated = await projectRepository.updateById(projectId, {
      status: "ACTIVE",
    });
    log.info("Project restored", { projectId, ownerId: userId });
    return updated;
  }

  async delete(projectId, userId) {
    const project = await this.getById(projectId, userId);
    if (project.status === "DELETED") {
      throw AppError.badRequest("Project is already deleted");
    }

    await projectRepository.softDelete(projectId);
    log.info("Project deleted", { projectId, ownerId: userId });
  }

  async permanentDelete(projectId, userId) {
    const membership = await this._guardAccess(projectId, userId);
    if (membership.role !== "OWNER") {
      throw AppError.forbidden("Only the owner can permanently delete a project");
    }
    const project = await projectRepository.findById(projectId);
    if (!project) throw AppError.notFound("Project not found");

    await projectRepository.permanentDelete(projectId);
    log.info("Project permanently deleted", { projectId, ownerId: userId });
  }

  async duplicate(projectId, userId) {
    const project = await this.getById(projectId, userId);

    let slug = slugify(`${project.name}-copy`);
    const existing = await projectRepository.findBySlug(userId, slug);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const duplicated = await projectRepository.create({
      name: `${project.name} (Copy)`,
      slug,
      description: project.description,
      icon: project.icon,
      color: project.color,
      language: project.language,
      framework: project.framework,
      visibility: "PRIVATE",
      ownerId: userId,
    });

    log.info("Project duplicated", {
      originalId: projectId,
      newId: duplicated.id,
      ownerId: userId,
    });
    return duplicated;
  }

  async open(projectId, userId) {
    const project = await this.getById(projectId, userId);
    await projectRepository.updateLastOpened(projectId);
    return project;
  }

  async getRecent(userId) {
    return projectRepository.getRecent(userId);
  }

  async addFavorite(projectId, userId) {
    const project = await this.getById(projectId, userId);
    const already = await projectRepository.isFavorite(userId, projectId);
    if (already) {
      throw AppError.conflict("Project is already in favorites");
    }
    await projectRepository.addFavorite(userId, projectId);
    log.info("Favorite added", { projectId, userId });
  }

  async removeFavorite(projectId, userId) {
    const project = await this.getById(projectId, userId);
    const already = await projectRepository.isFavorite(userId, projectId);
    if (!already) {
      throw AppError.badRequest("Project is not in favorites");
    }
    await projectRepository.removeFavorite(userId, projectId);
    log.info("Favorite removed", { projectId, userId });
  }

  async getFavorites(userId, query) {
    return projectRepository.findFavoritesByUser(userId, query);
  }

  async checkSlug(ownerId, slug) {
    const existing = await projectRepository.findBySlug(ownerId, slug);
    return { available: !existing, slug };
  }
}

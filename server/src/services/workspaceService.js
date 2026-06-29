import { WorkspaceRepository } from "../repositories/workspaceRepository.js";
import { ProjectRepository } from "../repositories/projectRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const workspaceRepository = new WorkspaceRepository();
const projectRepository = new ProjectRepository();
const memberRepository = new MemberRepository();

const MANAGER_ROLES = ["OWNER", "ADMIN"];

export class WorkspaceService {
  async getWorkspace(projectId, userId) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) {
      throw AppError.forbidden("You are not a member of this project");
    }

    const workspace = await workspaceRepository.findByProjectId(projectId);
    if (!workspace) {
      throw AppError.notFound("Workspace not found");
    }

    return workspace;
  }

  async updateWorkspace(projectId, userId, data) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw AppError.forbidden("Only owner and admins can update the workspace");
    }

    const updated = await workspaceRepository.updateByProjectId(projectId, data);
    log.info("Workspace updated", { projectId, userId });
    return updated;
  }
}

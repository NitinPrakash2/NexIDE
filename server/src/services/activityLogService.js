import { prisma } from "../lib/prisma.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { AppError } from "../utils/appError.js";

const activityLogRepository = new ActivityLogRepository();
const memberRepository = new MemberRepository();

export class ActivityLogService {
  async log(projectId, userId, type, message, metadata = null) {
    return activityLogRepository.create({ projectId, userId, type, message, metadata });
  }

  async list(projectId, userId, page = 1, limit = 50) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) throw AppError.forbidden("You are not a member of this project");
    return activityLogRepository.findByProject(projectId, page, limit);
  }
}

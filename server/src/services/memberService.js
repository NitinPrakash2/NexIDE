import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { InvitationRepository } from "../repositories/invitationRepository.js";
import { NotificationService } from "./notificationService.js";
import { ActivityLogService } from "./activityLogService.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const notificationService = new NotificationService();
const activityLogService = new ActivityLogService();

const memberRepository = new MemberRepository();
const invitationRepository = new InvitationRepository();

const MANAGER_ROLES = ["OWNER", "ADMIN"];

export class MemberService {
  async getMembers(projectId, userId) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) {
      throw AppError.forbidden("You are not a member of this project");
    }
    return memberRepository.findByProjectId(projectId);
  }

  async invite(projectId, userId, { email, role }) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw AppError.forbidden("Only owner and admins can invite members");
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      throw AppError.notFound("No user found with this email address");
    }

    const existingMember = await memberRepository.findByProjectAndUser(projectId, targetUser.id);
    if (existingMember) {
      throw AppError.conflict("This user is already a member of this project");
    }

    const pending = await invitationRepository.findPendingByProjectAndEmail(projectId, email);
    if (pending) {
      throw AppError.conflict("A pending invitation already exists for this email");
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await invitationRepository.create({
      projectId,
      email,
      role: role || "EDITOR",
      token,
      invitedBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    log.info("Member invited", { projectId, email, role, invitedBy: userId });

    if (targetUser) {
      await notificationService.create({
        userId: targetUser.id,
        type: "PROJECT_INVITE",
        title: "You've been invited",
        message: `You've been invited to join the project as ${role}`,
        projectId,
        actorId: userId,
      });
    }

    return invitation;
  }

  async acceptInvitation(token, userId) {
    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) {
      throw AppError.notFound("Invitation not found");
    }

    if (invitation.status !== "PENDING") {
      throw AppError.badRequest("Invitation is no longer pending");
    }

    if (new Date() > invitation.expiresAt) {
      await invitationRepository.updateStatus(invitation.id, "EXPIRED");
      throw AppError.badRequest("Invitation has expired");
    }

    const existing = await memberRepository.findByProjectAndUser(invitation.projectId, userId);
    if (existing) {
      throw AppError.conflict("You are already a member of this project");
    }

    await memberRepository.create({
      projectId: invitation.projectId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    });

    await invitationRepository.updateStatus(invitation.id, "ACCEPTED", userId);

    log.info("Invitation accepted", {
      invitationId: invitation.id,
      projectId: invitation.projectId,
      userId,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, username: true },
    });
    const members = await memberRepository.findByProjectId(invitation.projectId);
    const otherMembers = members.filter((m) => m.userId !== userId);

    for (const m of otherMembers) {
      await notificationService.create({
        userId: m.userId,
        type: "MEMBER_JOINED",
        title: "New member joined",
        message: `${user?.fullName || "Someone"} joined the project as ${invitation.role}`,
        projectId: invitation.projectId,
        actorId: userId,
      });
    }

    await activityLogService.log(invitation.projectId, userId, "INVITATION_ACCEPTED",
      `${user?.fullName || "A user"} accepted the invitation`);

    return { projectId: invitation.projectId, members };
  }

  async rejectInvitation(token, userId) {
    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) {
      throw AppError.notFound("Invitation not found");
    }

    if (invitation.status !== "PENDING") {
      throw AppError.badRequest("Invitation is no longer pending");
    }

    await invitationRepository.updateStatus(invitation.id, "REJECTED");

    log.info("Invitation rejected", {
      invitationId: invitation.id,
      projectId: invitation.projectId,
      userId,
    });
  }

  async updateRole(projectId, userId, memberId, newRole) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw AppError.forbidden("Only owner and admins can change roles");
    }

    const targetMember = await memberRepository.findById(memberId);
    if (!targetMember || targetMember.projectId !== projectId) {
      throw AppError.notFound("Member not found");
    }

    if (targetMember.userId === userId) {
      throw AppError.badRequest("You cannot change your own role");
    }

    if (targetMember.role === "OWNER") {
      throw AppError.badRequest("Cannot change the owner's role");
    }

    if (membership.role === "ADMIN" && newRole === "OWNER") {
      throw AppError.forbidden("Only the owner can transfer ownership");
    }

    const updated = await memberRepository.updateRole(memberId, newRole);

    await notificationService.create({
      userId: targetMember.userId,
      type: "ROLE_CHANGED",
      title: "Role updated",
      message: `Your role has been changed from ${targetMember.role} to ${newRole}`,
      projectId,
      actorId: userId,
    });

    await activityLogService.log(projectId, userId, "MEMBER_ROLE_CHANGED",
      `Role changed for ${targetMember.user?.fullName || "a member"} from ${targetMember.role} to ${newRole}`);

    log.info("Member role changed", {
      projectId,
      memberId,
      oldRole: targetMember.role,
      newRole,
      changedBy: userId,
    });
    return updated;
  }

  async removeMember(projectId, userId, memberId) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw AppError.forbidden("Only owner and admins can remove members");
    }

    const targetMember = await memberRepository.findById(memberId);
    if (!targetMember || targetMember.projectId !== projectId) {
      throw AppError.notFound("Member not found");
    }

    if (targetMember.role === "OWNER") {
      throw AppError.badRequest("Cannot remove the project owner");
    }

    if (membership.role === "ADMIN" && targetMember.role === "ADMIN") {
      throw AppError.forbidden("Admins cannot remove other admins");
    }

    await memberRepository.delete(memberId);

    await notificationService.create({
      userId: targetMember.userId,
      type: "MEMBER_LEFT",
      title: "Removed from project",
      message: `You have been removed from the project`,
      projectId,
      actorId: userId,
    });

    await activityLogService.log(projectId, userId, "MEMBER_LEFT",
      `${targetMember.user?.fullName || "A member"} was removed from the project`);

    log.info("Member removed", { projectId, memberId, removedBy: userId });
  }
}

import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { InvitationRepository } from "../repositories/invitationRepository.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

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

    const members = await memberRepository.findByProjectId(invitation.projectId);
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
    log.info("Member removed", { projectId, memberId, removedBy: userId });
  }
}

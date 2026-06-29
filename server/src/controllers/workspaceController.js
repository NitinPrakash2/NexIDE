import { WorkspaceService } from "../services/workspaceService.js";
import { MemberService } from "../services/memberService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";

const workspaceService = new WorkspaceService();
const memberService = new MemberService();

export const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspace(req.params.projectId, req.user.id);
  ApiResponse.ok("Workspace fetched successfully", workspace).send(res);
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace(req.params.projectId, req.user.id, req.body);
  ApiResponse.ok("Workspace updated successfully", workspace).send(res);
});

export const getMembers = asyncHandler(async (req, res) => {
  const members = await memberService.getMembers(req.params.projectId, req.user.id);
  ApiResponse.ok("Members fetched successfully", members).send(res);
});

export const inviteMember = asyncHandler(async (req, res) => {
  const invitation = await memberService.invite(req.params.projectId, req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "Invitation sent successfully", invitation).send(res);
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const member = await memberService.updateRole(
    req.params.projectId,
    req.user.id,
    req.params.memberId,
    req.body.role
  );
  ApiResponse.ok("Member role updated successfully", member).send(res);
});

export const removeMember = asyncHandler(async (req, res) => {
  await memberService.removeMember(req.params.projectId, req.user.id, req.params.memberId);
  ApiResponse.ok("Member removed successfully").send(res);
});

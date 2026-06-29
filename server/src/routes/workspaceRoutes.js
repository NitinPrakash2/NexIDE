import { Router } from "express";
import {
  getWorkspace,
  updateWorkspace,
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceController.js";
import { acceptInvitation, rejectInvitation } from "../controllers/invitationController.js";
import { authenticate, validate } from "../middlewares/index.js";
import {
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  projectIdParamSchema,
  memberIdParamSchema,
  tokenParamSchema,
} from "../validators/workspaceValidator.js";

const router = Router();

router.use(authenticate);

router.get("/:projectId/workspace", validate(projectIdParamSchema, "params"), getWorkspace);
router.patch("/:projectId/workspace", validate(projectIdParamSchema, "params"), validate(updateWorkspaceSchema), updateWorkspace);

router.get("/:projectId/members", validate(projectIdParamSchema, "params"), getMembers);
router.post("/:projectId/members/invite", validate(projectIdParamSchema, "params"), validate(inviteMemberSchema), inviteMember);
router.patch("/:projectId/members/:memberId/role", validate(projectIdParamSchema, "params"), validate(memberIdParamSchema, "params"), validate(updateMemberRoleSchema), updateMemberRole);
router.delete("/:projectId/members/:memberId", validate(projectIdParamSchema, "params"), validate(memberIdParamSchema, "params"), removeMember);

export default router;

import { MemberService } from "../services/memberService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const memberService = new MemberService();

export const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await memberService.acceptInvitation(req.params.token, req.user.id);
  ApiResponse.ok("Invitation accepted successfully", result).send(res);
});

export const rejectInvitation = asyncHandler(async (req, res) => {
  await memberService.rejectInvitation(req.params.token, req.user.id);
  ApiResponse.ok("Invitation rejected successfully").send(res);
});

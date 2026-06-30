import { VerificationService } from "../services/verificationService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const verificationService = new VerificationService();

export const sendVerificationEmail = asyncHandler(async (req, res) => {
  const result = await verificationService.sendVerificationEmail(req.user.id);
  ApiResponse.ok(result.message, result).send(res);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await verificationService.verifyEmail(req.params.token);
  ApiResponse.ok(result.message, result).send(res);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await verificationService.forgotPassword(req.body.email);
  ApiResponse.ok(result.message, result).send(res);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await verificationService.resetPassword(req.body.token, req.body.password);
  ApiResponse.ok(result.message, result).send(res);
});

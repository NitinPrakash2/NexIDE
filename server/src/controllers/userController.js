import { UserService } from "../services/userService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const userService = new UserService();

export const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  ApiResponse.ok("Profile fetched successfully", user).send(res);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  ApiResponse.ok("Profile updated successfully", user).send(res);
});

export const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  ApiResponse.ok("Password changed successfully. Please login again.").send(res);
});

export const deleteMe = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  ApiResponse.ok("Account deleted successfully").send(res);
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getPublicProfile(req.params.username);
  ApiResponse.ok("Profile fetched successfully", profile).send(res);
});

export const getPreferences = asyncHandler(async (req, res) => {
  const prefs = await userService.getPreferences(req.user.id);
  ApiResponse.ok("Preferences fetched successfully", prefs).send(res);
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const prefs = await userService.updatePreferences(req.user.id, req.body);
  ApiResponse.ok("Preferences updated successfully", prefs).send(res);
});

export const checkUsername = asyncHandler(async (req, res) => {
  const result = await userService.checkUsernameAvailability(req.params.username);
  ApiResponse.ok("Username availability checked", result).send(res);
});

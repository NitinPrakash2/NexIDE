import { AuthService } from "../services/authService.js";
import { OAuthService } from "../services/oauthService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { env } from "../config/env.js";

const authService = new AuthService();
const oauthService = new OAuthService();

const REFRESH_TOKEN_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.IS_PRODUCTION,
  sameSite: env.IS_PRODUCTION ? "strict" : "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/v1/auth" });
};

const extractRefreshToken = (req) => {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  ApiResponse.created("Registration successful", result).send(res);
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  ApiResponse.ok("Login successful", { accessToken, user }).send(res);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  if (refreshToken) {
    try {
      const { verifyRefreshToken } = await import("../config/jwt.js");
      const payload = verifyRefreshToken(refreshToken);
      await authService.logout(payload.userId);
    } catch {
      // Token already invalid; proceed with logout
    }
  }
  clearRefreshCookie(res);
  ApiResponse.ok("Logout successful").send(res);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  const result = await authService.refresh(refreshToken);
  setRefreshCookie(res, result.refreshToken);
  ApiResponse.ok("Token refreshed", { accessToken: result.accessToken, user: result.user }).send(res);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  ApiResponse.ok("User fetched successfully", user).send(res);
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const result = await oauthService.authenticateWithGoogle(idToken);
  setRefreshCookie(res, result.refreshToken);
  ApiResponse.ok("Google authentication successful", {
    accessToken: result.accessToken,
    user: result.user,
  }).send(res);
});

export const githubAuth = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const result = await oauthService.authenticateWithGithub(code);
  setRefreshCookie(res, result.refreshToken);
  ApiResponse.ok("GitHub authentication successful", {
    accessToken: result.accessToken,
    user: result.user,
    githubAccessToken: result.githubAccessToken,
  }).send(res);
});

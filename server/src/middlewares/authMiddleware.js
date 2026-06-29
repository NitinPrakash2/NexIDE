import { verifyAccessToken } from "../config/jwt.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const userRepository = new UserRepository();

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    throw AppError.unauthorized("Access token is required");
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  const user = await userRepository.findById(payload.userId);
  if (!user) {
    throw AppError.unauthorized("User not found");
  }

  req.user = {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isVerified: user.isVerified,
  };

  next();
});

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden("You do not have permission to perform this action");
    }

    next();
  };
};

export const authorizeSelf = (paramName = "id") => {
  return (req, res, next) => {
    if (!req.user) {
      throw AppError.unauthorized("Authentication required");
    }

    if (req.user.role !== "OWNER" && req.user.role !== "ADMIN" && req.params[paramName] !== req.user.id) {
      throw AppError.forbidden("You can only access your own resources");
    }

    next();
  };
};

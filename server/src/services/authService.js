import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/userRepository.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../config/jwt.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const userRepository = new UserRepository();

const SALT_ROUNDS = 12;

const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
};

export class AuthService {
  async register({ fullName, username, email, password }) {
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw AppError.conflict("An account with this email already exists");
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw AppError.conflict("This username is already taken");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await userRepository.create({
      fullName,
      username,
      email,
      password: hashedPassword,
      provider: "LOCAL",
    });

    return sanitizeUser(user);
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);

    if (!user || user.provider !== "LOCAL" || !user.password) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      log.warn("Failed login attempt", { email });
      throw AppError.unauthorized("Invalid email or password");
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    await userRepository.updateRefreshToken(user.id, refreshToken);
    await userRepository.updateLastLogin(user.id);

    log.info("Successful login", { userId: user.id, email: user.email });

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token is required");
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id });

    await userRepository.updateRefreshToken(user.id, newRefreshToken);

    log.info("Token refreshed", { userId: user.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
  }

  async logout(userId) {
    await userRepository.updateRefreshToken(userId, null);
    log.info("User logged out", { userId });
  }

  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return sanitizeUser(user);
  }
}

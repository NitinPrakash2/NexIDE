import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { UserRepository } from "../repositories/userRepository.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const userRepository = new UserRepository();

export class VerificationService {
  async _createToken(userId, type) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { userId, token, type, expiresAt },
    });

    return token;
  }

  async _verifyToken(token, type) {
    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (!record) throw AppError.notFound("Invalid or expired token");
    if (record.type !== type) throw AppError.badRequest("Invalid token type");
    if (record.usedAt) throw AppError.badRequest("Token has already been used");
    if (new Date() > record.expiresAt) throw AppError.badRequest("Token has expired");

    await prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record;
  }

  async sendVerificationEmail(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    if (user.isVerified) throw AppError.badRequest("Email is already verified");

    const token = await this._createToken(userId, "EMAIL_VERIFY");
    log.info("Email verification token generated", { userId, token });

    return { message: "Verification email sent", token };
  }

  async verifyEmail(token) {
    const record = await this._verifyToken(token, "EMAIL_VERIFY");
    await userRepository.updateById(record.userId, { isVerified: true });
    log.info("Email verified", { userId: record.userId });
    return { message: "Email verified successfully" };
  }

  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: "If an account with that email exists, a reset link has been sent" };
    }

    const token = await this._createToken(user.id, "PASSWORD_RESET");
    log.info("Password reset token generated", { userId: user.id, token });

    return { message: "If an account with that email exists, a reset link has been sent" };
  }

  async resetPassword(token, newPassword) {
    const { default: bcrypt } = await import("bcryptjs");
    const record = await this._verifyToken(token, "PASSWORD_RESET");

    const hashed = await bcrypt.hash(newPassword, 12);
    await userRepository.updateById(record.userId, { password: hashed });

    await prisma.user.update({
      where: { id: record.userId },
      data: { refreshToken: null },
    });

    log.info("Password reset completed", { userId: record.userId });
    return { message: "Password reset successfully" };
  }
}

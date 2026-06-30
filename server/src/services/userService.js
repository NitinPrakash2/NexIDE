import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/userRepository.js";
import { getStorageService } from "./storageService.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const userRepository = new UserRepository();

const PUBLIC_FIELDS = {
  id: true,
  fullName: true,
  username: true,
  bio: true,
  avatar: true,
  role: true,
  createdAt: true,
};

const sanitizeUser = (user) => {
  const { password, refreshToken, deletedAt, providerId, ...safeUser } = user;
  return safeUser;
};

export class UserService {
  async getProfile(userId) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return sanitizeUser(user);
  }

  async updateProfile(userId, data) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (data.username && data.username !== user.username) {
      const existing = await userRepository.findByUsername(data.username);
      if (existing) {
        throw AppError.conflict("This username is already taken");
      }
    }

    const updated = await userRepository.updateById(userId, data);
    log.info("Profile updated", { userId });
    return sanitizeUser(updated);
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.provider !== "LOCAL" || !user.password) {
      throw AppError.badRequest(
        "Cannot change password for OAuth accounts. Use your provider's account settings."
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw AppError.badRequest("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await userRepository.updateById(userId, {
      password: hashedPassword,
      refreshToken: null,
    });

    log.info("Password changed", { userId });
  }

  async deleteAccount(userId) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    await userRepository.softDelete(userId);
    log.info("Account deleted", { userId });
  }

  async getPublicProfile(username) {
    const user = await userRepository.findActiveByUsername(username);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      bio: user.bio,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
    };
  }

  async updateAvatarFromDataUrl(userId, dataUrl) {
    const user = await userRepository.findActiveById(userId);
    if (!user) throw AppError.notFound("User not found");

    await userRepository.updateById(userId, { avatar: dataUrl });
    log.info("Avatar updated", { userId });
    return { url: dataUrl };
  }

  async updateAvatar(userId, buffer, filename, mimetype) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    const storage = getStorageService();
    const result = await storage.upload(buffer, filename, mimetype);

    await userRepository.updateById(userId, { avatar: result.url });
    log.info("Avatar updated", { userId });

    return { url: result.url };
  }

  async updatePreferences(userId, preferences) {
    const user = await userRepository.findActiveById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    const updated = await userRepository.upsertPreferences(userId, preferences);
    return updated;
  }

  async getPreferences(userId) {
    const prefs = await userRepository.getPreferences(userId);
    if (!prefs) {
      return {
        theme: "dark",
        language: "en",
        timezone: "UTC",
        editorFontSize: 14,
        editorTabSize: 2,
        editorWordWrap: false,
        editorMinimap: true,
      };
    }
    return prefs;
  }

  async checkUsernameAvailability(username) {
    const user = await userRepository.findByUsername(username);
    return { available: !user, username };
  }
}

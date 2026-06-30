import { z } from "zod";

const RESERVED_USERNAMES = [
  "admin", "root", "system", "api", "nexide", "nexus",
  "moderator", "support", "help", "info", "security",
  "login", "register", "logout", "dashboard", "settings",
  "profile", "me", "superuser", "owner", "administrator",
];

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters")
    .trim()
    .optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase()
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val),
      { message: "This username is reserved and cannot be used" }
    )
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must not exceed 500 characters")
    .trim()
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must not exceed 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updatePreferencesSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().optional(),
  editorFontSize: z.number().int().min(10).max(32).optional(),
  editorTabSize: z.number().int().min(1).max(8).optional(),
  editorWordWrap: z.boolean().optional(),
  editorMinimap: z.boolean().optional(),
});

export const usernameParamSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase(),
});

export const updateAvatarSchema = z.object({
  avatar: z.string().min(1, "Avatar data is required"),
});

import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId format");

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, "Page must be a positive integer"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),
  sort: z.string().optional().default("-createdAt"),
  search: z.string().optional(),
});

export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  );

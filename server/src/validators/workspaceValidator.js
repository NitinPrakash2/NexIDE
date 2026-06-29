import { z } from "zod";

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name must not exceed 100 characters")
    .trim()
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export const memberIdParamSchema = z.object({
  memberId: z.string().uuid("Invalid member ID"),
});

export const tokenParamSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

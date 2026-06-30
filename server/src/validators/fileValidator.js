import { z } from "zod";

export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name must not exceed 255 characters")
    .regex(/^[^/\\:*?"<>|]+$/, "Folder name contains invalid characters")
    .trim(),
  parentId: z.string().uuid("Invalid parent folder ID").nullable().optional(),
});

export const renameFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name must not exceed 255 characters")
    .regex(/^[^/\\:*?"<>|]+$/, "Folder name contains invalid characters")
    .trim(),
});

export const createFileSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters")
    .regex(/^[^/\\:*?"<>|]+$/, "File name contains invalid characters")
    .trim(),
  folderId: z.string().uuid("Invalid folder ID").nullable().optional(),
  content: z.string().optional().default(""),
});

export const updateFileSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters")
    .regex(/^[^/\\:*?"<>|]+$/, "File name contains invalid characters")
    .trim()
    .optional(),
  content: z.string().optional(),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export const folderIdParamSchema = z.object({
  folderId: z.string().uuid("Invalid folder ID"),
});

export const fileIdParamSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
});

export const moveFileSchema = z.object({
  folderId: z.string().uuid("Invalid folder ID").nullable(),
});

export const copyFileSchema = z.object({
  folderId: z.string().uuid("Invalid folder ID").nullable(),
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters")
    .regex(/^[^/\\:*?"<>|]+$/, "File name contains invalid characters")
    .optional(),
});

import { z } from "zod";

export const importRepoSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .regex(
      /github\.com[/:]|^[\w.-]+\/[\w.-]+/,
      "Must be a valid GitHub repository URL (e.g. https://github.com/owner/repo or owner/repo)"
    ),
  githubAccessToken: z
    .string()
    .optional(),
  branch: z
    .string()
    .optional(),
});

export const listReposSchema = z.object({
  githubAccessToken: z
    .string()
    .min(1, "GitHub access token is required"),
});

export const githubProjectIdParamSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(200).regex(/^[a-zA-Z0-9_./-]+$/, "Invalid branch name"),
  source: z.string().optional(),
});

export const branchNameSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(200),
});

export const commitSchema = z.object({
  message: z.string().min(1, "Commit message is required").max(500),
  files: z.array(z.string()).optional(),
});

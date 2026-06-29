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

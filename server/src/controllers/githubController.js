import { GithubService } from "../services/githubService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const githubService = new GithubService();

export const importRepo = asyncHandler(async (req, res) => {
  const result = await githubService.importRepository(req.user.id, req.body);
  ApiResponse.created("Repository imported successfully", result).send(res);
});

export const syncRepo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.syncRepository(req.user.id, id);
  ApiResponse.ok("Repository synced successfully", result).send(res);
});

export const getLinkedRepo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const repo = await githubService.getLinkedRepo(id, req.user.id);
  if (!repo) {
    return ApiResponse.ok("No linked repository", { linked: false }).send(res);
  }
  ApiResponse.ok("Linked repository found", { linked: true, repo }).send(res);
});

export const unlinkRepo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.unlinkRepo(id, req.user.id);
  ApiResponse.ok("Repository unlinked", result).send(res);
});

export const listUserRepos = asyncHandler(async (req, res) => {
  const { githubAccessToken } = req.query;
  const repos = await githubService.listUserRepos(githubAccessToken);
  ApiResponse.ok("Repositories fetched successfully", { repos }).send(res);
});

export const regenerateWebhook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.regenerateWebhookSecret(id, req.user.id);
  ApiResponse.ok("Webhook secret regenerated", result).send(res);
});

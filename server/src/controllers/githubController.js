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

// ── Git Operations ─────────────────────────────────────

export const listBranches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const branches = await githubService.listBranches(id, req.user.id);
  ApiResponse.ok("Branches fetched", { branches }).send(res);
});

export const createBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.createBranch(id, req.user.id, req.body);
  ApiResponse.created("Branch created", result).send(res);
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.deleteBranch(id, req.user.id, req.body);
  ApiResponse.ok("Branch deleted", result).send(res);
});

export const checkoutBranch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.checkoutBranch(id, req.user.id, req.body);
  ApiResponse.ok("Branch checked out", result).send(res);
});

export const commit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.commit(id, req.user.id, req.body);
  ApiResponse.ok("Commit created", result).send(res);
});

export const push = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.push(id, req.user.id, req.body);
  ApiResponse.ok("Push completed", result).send(res);
});

export const pull = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.pull(id, req.user.id);
  ApiResponse.ok("Pull completed", result).send(res);
});

export const getStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await githubService.getStatus(id, req.user.id);
  ApiResponse.ok("Status fetched", result).send(res);
});

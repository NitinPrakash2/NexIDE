import { ProjectService } from "../services/projectService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";

const projectService = new ProjectService();

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.create(req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "Project created successfully", project).send(res);
});

export const getMyProjects = asyncHandler(async (req, res) => {
  const result = await projectService.getMyProjects(req.user.id, req.query);
  ApiResponse.ok("Projects fetched successfully", result.projects, {
    total: result.total,
    page: result.page,
    limit: result.limit,
  }).send(res);
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id, req.user.id);
  ApiResponse.ok("Project fetched successfully", project).send(res);
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.update(req.params.id, req.user.id, req.body);
  ApiResponse.ok("Project updated successfully", project).send(res);
});

export const archiveProject = asyncHandler(async (req, res) => {
  const project = await projectService.archive(req.params.id, req.user.id);
  ApiResponse.ok("Project archived successfully", project).send(res);
});

export const restoreProject = asyncHandler(async (req, res) => {
  const project = await projectService.restore(req.params.id, req.user.id);
  ApiResponse.ok("Project restored successfully", project).send(res);
});

export const deleteProject = asyncHandler(async (req, res) => {
  await projectService.delete(req.params.id, req.user.id);
  ApiResponse.ok("Project deleted successfully").send(res);
});

export const permanentDeleteProject = asyncHandler(async (req, res) => {
  await projectService.permanentDelete(req.params.id, req.user.id);
  ApiResponse.ok("Project permanently deleted").send(res);
});

export const duplicateProject = asyncHandler(async (req, res) => {
  const project = await projectService.duplicate(req.params.id, req.user.id);
  ApiResponse.success(HTTP_STATUS.CREATED, "Project duplicated successfully", project).send(res);
});

export const openProject = asyncHandler(async (req, res) => {
  const project = await projectService.open(req.params.id, req.user.id);
  ApiResponse.ok("Project opened", project).send(res);
});

export const getRecentProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getRecent(req.user.id);
  ApiResponse.ok("Recent projects fetched successfully", projects).send(res);
});

export const addFavorite = asyncHandler(async (req, res) => {
  await projectService.addFavorite(req.params.id, req.user.id);
  ApiResponse.ok("Project added to favorites").send(res);
});

export const removeFavorite = asyncHandler(async (req, res) => {
  await projectService.removeFavorite(req.params.id, req.user.id);
  ApiResponse.ok("Project removed from favorites").send(res);
});

export const getFavorites = asyncHandler(async (req, res) => {
  const result = await projectService.getFavorites(req.user.id, req.query);
  ApiResponse.ok("Favorites fetched successfully", result.favorites, {
    total: result.total,
    page: result.page,
    limit: result.limit,
  }).send(res);
});

export const checkProjectSlug = asyncHandler(async (req, res) => {
  const result = await projectService.checkSlug(req.user.id, req.params.slug);
  ApiResponse.ok("Slug availability checked", result).send(res);
});

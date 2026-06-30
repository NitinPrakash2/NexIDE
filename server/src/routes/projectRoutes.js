import { Router } from "express";
import {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  permanentDeleteProject,
  duplicateProject,
  openProject,
  getRecentProjects,
  addFavorite,
  removeFavorite,
  getFavorites,
  checkProjectSlug,
} from "../controllers/projectController.js";
import { authenticate, validate } from "../middlewares/index.js";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  projectQuerySchema,
  projectSlugParamSchema,
} from "../validators/projectValidator.js";
import { apiRateLimiter } from "../config/rateLimiter.js";

const router = Router();

router.use(authenticate);

router.get("/", validate(projectQuerySchema, "query"), getMyProjects);
router.post("/", validate(createProjectSchema), createProject);

router.get("/favorites", validate(projectQuerySchema, "query"), getFavorites);
router.get("/recent", validate(projectQuerySchema, "query"), getRecentProjects);
router.get("/check-slug/:slug", validate(projectSlugParamSchema, "params"), checkProjectSlug);

router.get("/:id", validate(projectIdParamSchema, "params"), getProjectById);
router.patch("/:id", validate(projectIdParamSchema, "params"), validate(updateProjectSchema), updateProject);

router.patch("/:id/archive", validate(projectIdParamSchema, "params"), archiveProject);
router.patch("/:id/restore", validate(projectIdParamSchema, "params"), restoreProject);
router.delete("/:id", validate(projectIdParamSchema, "params"), deleteProject);
router.delete("/:id/permanent", validate(projectIdParamSchema, "params"), permanentDeleteProject);
router.post("/:id/duplicate", validate(projectIdParamSchema, "params"), duplicateProject);
router.post("/:id/open", validate(projectIdParamSchema, "params"), openProject);

router.post("/:id/favorite", validate(projectIdParamSchema, "params"), addFavorite);
router.delete("/:id/favorite", validate(projectIdParamSchema, "params"), removeFavorite);

export default router;

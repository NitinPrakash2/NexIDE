import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { importRepoSchema, listReposSchema, githubProjectIdParamSchema, branchSchema, commitSchema, branchNameSchema } from "../validators/githubValidator.js";
import {
  importRepo, syncRepo, getLinkedRepo, unlinkRepo, listUserRepos, regenerateWebhook,
  listBranches, createBranch, deleteBranch, checkoutBranch, commit, push, pull, getStatus,
} from "../controllers/githubController.js";
import { webhook } from "../controllers/githubWebhookController.js";

const router = Router();

router.post("/webhook", webhook);
router.post("/import", authenticate, validate(importRepoSchema), importRepo);
router.post("/:id/sync", authenticate, validate(githubProjectIdParamSchema, "params"), syncRepo);
router.get("/:id/linked", authenticate, validate(githubProjectIdParamSchema, "params"), getLinkedRepo);
router.delete("/:id/linked", authenticate, validate(githubProjectIdParamSchema, "params"), unlinkRepo);
router.get("/repos", authenticate, validate(listReposSchema, "query"), listUserRepos);
router.post("/:id/webhook-secret", authenticate, validate(githubProjectIdParamSchema, "params"), regenerateWebhook);

// Git Operations
router.get("/:id/branches", authenticate, validate(githubProjectIdParamSchema, "params"), listBranches);
router.post("/:id/branches", authenticate, validate(githubProjectIdParamSchema, "params"), validate(branchSchema), createBranch);
router.delete("/:id/branches", authenticate, validate(githubProjectIdParamSchema, "params"), validate(branchNameSchema), deleteBranch);
router.post("/:id/checkout", authenticate, validate(githubProjectIdParamSchema, "params"), validate(branchNameSchema), checkoutBranch);
router.post("/:id/commit", authenticate, validate(githubProjectIdParamSchema, "params"), validate(commitSchema), commit);
router.post("/:id/push", authenticate, validate(githubProjectIdParamSchema, "params"), push);
router.post("/:id/pull", authenticate, validate(githubProjectIdParamSchema, "params"), pull);
router.get("/:id/status", authenticate, validate(githubProjectIdParamSchema, "params"), getStatus);

export default router;

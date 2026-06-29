import { Router } from "express";
import { authenticate, validate } from "../middlewares/index.js";
import { importRepoSchema, listReposSchema } from "../validators/githubValidator.js";
import { importRepo, syncRepo, getLinkedRepo, unlinkRepo, listUserRepos, regenerateWebhook } from "../controllers/githubController.js";
import { webhook } from "../controllers/githubWebhookController.js";

const router = Router();

router.post("/webhook", webhook);
router.post("/import", authenticate, validate(importRepoSchema), importRepo);
router.post("/:id/sync", authenticate, syncRepo);
router.get("/:id/linked", authenticate, getLinkedRepo);
router.delete("/:id/linked", authenticate, unlinkRepo);
router.get("/repos", authenticate, validate(listReposSchema, "query"), listUserRepos);
router.post("/:id/webhook-secret", authenticate, regenerateWebhook);

export default router;

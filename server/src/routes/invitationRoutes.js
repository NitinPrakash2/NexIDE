import { Router } from "express";
import { acceptInvitation, rejectInvitation } from "../controllers/invitationController.js";
import { authenticate, validate } from "../middlewares/index.js";
import { tokenParamSchema } from "../validators/workspaceValidator.js";

const router = Router();

router.use(authenticate);

router.post("/:token/accept", validate(tokenParamSchema, "params"), acceptInvitation);
router.post("/:token/reject", validate(tokenParamSchema, "params"), rejectInvitation);

export default router;

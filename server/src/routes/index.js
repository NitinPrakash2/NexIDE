import { Router } from "express";
import healthRoutes from "./healthRoutes.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import projectRoutes from "./projectRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";
import invitationRoutes from "./invitationRoutes.js";
import fileRoutes from "./fileRoutes.js";
import chatRoutes from "./chatRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import runtimeRoutes from "./runtimeRoutes.js";
import aiRoutes from "./aiRoutes.js";
import githubRoutes from "./githubRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/projects", workspaceRoutes);
router.use("/projects", fileRoutes);
router.use("/projects/:projectId/chat", chatRoutes);
router.use("/projects/:projectId/containers", runtimeRoutes);
router.use("/ai", aiRoutes);
router.use("/notifications", notificationRoutes);
router.use("/invitations", invitationRoutes);
router.use("/github", githubRoutes);

export default router;

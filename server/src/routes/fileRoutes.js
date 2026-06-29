import { Router } from "express";
import {
  getTree,
  createFolder,
  renameFolder,
  deleteFolder,
  createFile,
  getFile,
  updateFile,
  renameFile,
  deleteFile,
} from "../controllers/fileController.js";
import { authenticate, validate } from "../middlewares/index.js";
import {
  createFolderSchema,
  renameFolderSchema,
  createFileSchema,
  updateFileSchema,
  projectIdParamSchema,
  folderIdParamSchema,
  fileIdParamSchema,
} from "../validators/fileValidator.js";

const router = Router();

router.use(authenticate);

router.get("/:projectId/files/tree", validate(projectIdParamSchema, "params"), getTree);

router.post("/:projectId/folders", validate(projectIdParamSchema, "params"), validate(createFolderSchema), createFolder);
router.patch("/:projectId/folders/:folderId/rename", validate(projectIdParamSchema, "params"), validate(folderIdParamSchema, "params"), validate(renameFolderSchema), renameFolder);
router.delete("/:projectId/folders/:folderId", validate(projectIdParamSchema, "params"), validate(folderIdParamSchema, "params"), deleteFolder);

router.post("/:projectId/files", validate(projectIdParamSchema, "params"), validate(createFileSchema), createFile);
router.get("/:projectId/files/:fileId", validate(projectIdParamSchema, "params"), validate(fileIdParamSchema, "params"), getFile);
router.put("/:projectId/files/:fileId", validate(projectIdParamSchema, "params"), validate(fileIdParamSchema, "params"), validate(updateFileSchema), updateFile);
router.patch("/:projectId/files/:fileId/rename", validate(projectIdParamSchema, "params"), validate(fileIdParamSchema, "params"), validate(renameFolderSchema), renameFile);
router.delete("/:projectId/files/:fileId", validate(projectIdParamSchema, "params"), validate(fileIdParamSchema, "params"), deleteFile);

export default router;

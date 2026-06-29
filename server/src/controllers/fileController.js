import { FileService } from "../services/fileService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";
import { HTTP_STATUS } from "../constants/index.js";

const fileService = new FileService();

export const getTree = asyncHandler(async (req, res) => {
  const tree = await fileService.getTree(req.params.projectId, req.user.id);
  ApiResponse.ok("File tree fetched successfully", tree).send(res);
});

export const createFolder = asyncHandler(async (req, res) => {
  const folder = await fileService.createFolder(req.params.projectId, req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "Folder created successfully", folder).send(res);
});

export const renameFolder = asyncHandler(async (req, res) => {
  const folder = await fileService.renameFolder(req.params.projectId, req.user.id, req.params.folderId, req.body);
  ApiResponse.ok("Folder renamed successfully", folder).send(res);
});

export const deleteFolder = asyncHandler(async (req, res) => {
  await fileService.deleteFolder(req.params.projectId, req.user.id, req.params.folderId);
  ApiResponse.ok("Folder deleted successfully").send(res);
});

export const createFile = asyncHandler(async (req, res) => {
  const file = await fileService.createFile(req.params.projectId, req.user.id, req.body);
  ApiResponse.success(HTTP_STATUS.CREATED, "File created successfully", file).send(res);
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await fileService.getFile(req.params.projectId, req.user.id, req.params.fileId);
  ApiResponse.ok("File fetched successfully", file).send(res);
});

export const updateFile = asyncHandler(async (req, res) => {
  const file = await fileService.updateFile(req.params.projectId, req.user.id, req.params.fileId, req.body);
  ApiResponse.ok("File updated successfully", file).send(res);
});

export const renameFile = asyncHandler(async (req, res) => {
  const file = await fileService.renameFile(req.params.projectId, req.user.id, req.params.fileId, req.body);
  ApiResponse.ok("File renamed successfully", file).send(res);
});

export const deleteFile = asyncHandler(async (req, res) => {
  await fileService.deleteFile(req.params.projectId, req.user.id, req.params.fileId);
  ApiResponse.ok("File deleted successfully").send(res);
});

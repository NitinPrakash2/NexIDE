import { prisma } from "../lib/prisma.js";
import { ProjectRepository } from "../repositories/projectRepository.js";
import { FileRepository } from "../repositories/fileRepository.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";
import crypto from "crypto";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { exec } from "child_process";

const projectRepository = new ProjectRepository();
const fileRepository = new FileRepository();

const REPO_DIRS = {};

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024, ...options }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || stdout || err.message));
      else resolve(stdout);
    });
  });
}

function parseGithubUrl(url) {
  const trimmed = url.replace(/\.git$/, "").trim();
  let match = trimmed.match(/github\.com[:/]([^/]+)\/([^/]+)/);
  if (!match) {
    match = trimmed.match(/^([^/]+)\/([^/]+)$/);
  }
  if (!match) {
    throw AppError.badRequest("Invalid GitHub repository URL");
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function splitExtension(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { name: filename, ext: "" };
  return { name: filename.slice(0, dot), ext: filename.slice(dot + 1) };
}

export class GithubService {
  async importRepository(userId, { repoUrl, githubAccessToken, branch }) {
    const parsed = parseGithubUrl(repoUrl);
    const repoFullName = `${parsed.owner}/${parsed.repo}`;
    const projectName = parsed.repo;

    const cloneUrl = githubAccessToken
      ? `https://x-access-token:${githubAccessToken}@github.com/${repoFullName}.git`
      : `https://github.com/${repoFullName}.git`;

    const tempDir = path.join(
      os.tmpdir(),
      `nexide-import-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
    );

    try {
      await fs.mkdir(tempDir, { recursive: true });
      log.info("Cloning repository", { repoFullName, tempDir });

      let cloneCmd = `git clone --depth 1 ${cloneUrl} "${tempDir}"`;
      if (branch) {
        cloneCmd = `git clone --depth 1 --branch ${branch} ${cloneUrl} "${tempDir}"`;
      }

      try {
        await execPromise(cloneCmd, { timeout: 120000 });
      } catch (cloneErr) {
        const msg = cloneErr.message || "";
        if (msg.includes("Repository not found") || msg.includes("not found")) {
          throw AppError.notFound("GitHub repository not found. Check the URL or provide a valid access token.");
        }
        if (msg.includes("Authentication failed") || msg.includes("access token")) {
          throw AppError.unauthorized("GitHub authentication failed. The access token may be invalid or lacks permissions.");
        }
        throw AppError.badRequest(`Failed to clone repository: ${msg.slice(0, 500)}`);
      }

      const project = await projectRepository.create({
        name: projectName,
        slug: `${projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`,
        description: `Imported from GitHub: ${repoUrl}`,
        language: "javascript",
        ownerId: userId,
      });

      await prisma.workspace.create({
        data: { projectId: project.id, name: projectName },
      });

      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: "OWNER" },
      });

      const stats = await this._importDirectory(project.id, tempDir, null);

      const webhookSecret = crypto.randomBytes(20).toString("hex");

      await prisma.githubRepo.create({
        data: {
          projectId: project.id,
          userId,
          repoUrl,
          repoFullName,
          defaultBranch: branch || "main",
          webhookSecret,
          lastSyncedAt: new Date(),
        },
      });

      log.info("Repository imported", { projectId: project.id, repoFullName, ...stats });

      return {
        project: await projectRepository.findById(project.id),
        stats,
        webhookSecret,
        webhookUrl: `/api/v1/github/webhook`,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async _importDirectory(projectId, dirPath, parentFolderId) {
    let foldersCreated = 0;
    let filesCreated = 0;

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        let parentPath = "";
        if (parentFolderId) {
          const parent = await fileRepository.findFolderById(parentFolderId);
          if (parent) parentPath = parent.path;
        }
        const folderPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

        const folder = await fileRepository.createFolder({
          name: entry.name,
          path: folderPath,
          projectId,
          parentId: parentFolderId || null,
        });

        foldersCreated++;

        const subStats = await this._importDirectory(projectId, fullPath, folder.id);
        foldersCreated += subStats.foldersCreated;
        filesCreated += subStats.filesCreated;
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath, "utf-8").catch(() => null);
        const contentStr = content || "";

        let parentPath = "";
        if (parentFolderId) {
          const parent = await fileRepository.findFolderById(parentFolderId);
          if (parent) parentPath = parent.path;
        }
        const filePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        const { ext } = splitExtension(entry.name);

        try {
          await fileRepository.createFile({
            name: entry.name,
            extension: ext,
            path: filePath,
            content: contentStr,
            size: Buffer.byteLength(contentStr, "utf-8"),
            projectId,
            folderId: parentFolderId || null,
          });
          filesCreated++;
        } catch (err) {
          if (err.code === "P2002") {
            log.warn("Skipping duplicate file", { path: filePath, projectId });
          } else {
            throw err;
          }
        }
      }
    }

    return { foldersCreated, filesCreated };
  }

  async syncRepository(userId, projectId) {
    const githubRepo = await prisma.githubRepo.findUnique({
      where: { projectId },
    });

    if (!githubRepo || githubRepo.userId !== userId) {
      throw AppError.notFound("GitHub repository link not found for this project");
    }

    const tempDir = path.join(
      os.tmpdir(),
      `nexide-sync-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`
    );

    try {
      const cloneUrl = `https://github.com/${githubRepo.repoFullName}.git`;

      await fs.mkdir(tempDir, { recursive: true });
      await execPromise(`git clone --depth 1 ${cloneUrl} "${tempDir}"`, { timeout: 120000 });

      await prisma.file.deleteMany({ where: { projectId } });

      const folderIds = await prisma.folder.findMany({
        where: { projectId },
        select: { id: true },
        orderBy: { path: "desc" },
      });
      for (const f of folderIds) {
        await prisma.folder.delete({ where: { id: f.id } }).catch(() => {});
      }

      const stats = await this._importDirectory(projectId, tempDir, null);

      await prisma.githubRepo.update({
        where: { projectId },
        data: { lastSyncedAt: new Date() },
      });

      log.info("Repository synced", { projectId, ...stats });
      return { stats };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async getLinkedRepo(projectId, userId) {
    const githubRepo = await prisma.githubRepo.findUnique({
      where: { projectId },
    });

    if (!githubRepo) return null;
    if (githubRepo.userId !== userId) {
      throw AppError.forbidden("You do not have access to this repository link");
    }

    return {
      ...githubRepo,
      webhookUrl: `/api/v1/github/webhook`,
    };
  }

  async regenerateWebhookSecret(projectId, userId) {
    const githubRepo = await prisma.githubRepo.findUnique({
      where: { projectId },
    });

    if (!githubRepo) {
      throw AppError.notFound("No GitHub repository linked to this project");
    }
    if (githubRepo.userId !== userId) {
      throw AppError.forbidden("Only the user who imported the repo can regenerate the webhook secret");
    }

    const webhookSecret = crypto.randomBytes(20).toString("hex");

    await prisma.githubRepo.update({
      where: { projectId },
      data: { webhookSecret },
    });

    log.info("Webhook secret regenerated", { projectId });

    return { webhookSecret, webhookUrl: `/api/v1/github/webhook` };
  }

  async unlinkRepo(projectId, userId) {
    const githubRepo = await prisma.githubRepo.findUnique({
      where: { projectId },
    });

    if (!githubRepo) {
      throw AppError.notFound("No GitHub repository linked to this project");
    }
    if (githubRepo.userId !== userId) {
      throw AppError.forbidden("Only the user who imported the repo can unlink it");
    }

    await prisma.githubRepo.delete({ where: { projectId } });

    log.info("Repository unlinked", { projectId });

    return { unlinked: true };
  }

  async listUserRepos(githubAccessToken) {
    if (!githubAccessToken) {
      throw AppError.badRequest("GitHub access token is required");
    }

    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      throw AppError.unauthorized("Failed to fetch repositories from GitHub");
    }

    const repos = await res.json();
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      private: repo.private,
      language: repo.language,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
    }));
  }

  // ── Git Operations ────────────────────────────────────

  _repoDir(projectId) {
    if (REPO_DIRS[projectId]) return REPO_DIRS[projectId];
    const dir = path.join(os.tmpdir(), `nexide-repo-${projectId}`);
    REPO_DIRS[projectId] = dir;
    return dir;
  }

  async _ensureRepo(projectId, userId) {
    const repoDir = this._repoDir(projectId);
    const exists = await fs.stat(repoDir).then(() => true).catch(() => false);

    const githubRepo = await prisma.githubRepo.findUnique({ where: { projectId } });
    if (!githubRepo || githubRepo.userId !== userId) {
      throw AppError.notFound("No GitHub repository linked to this project");
    }

    if (!exists) {
      await fs.mkdir(path.dirname(repoDir), { recursive: true }).catch(() => {});
      log.info("Cloning full repo for git ops", { projectId, repo: githubRepo.repoFullName });
      await execPromise(`git clone "https://github.com/${githubRepo.repoFullName}.git" "${repoDir}"`, { timeout: 180000 });
      await execPromise(`git config user.email "nexide@users.noreply.github.com"`, { cwd: repoDir });
      await execPromise(`git config user.name "NexIDE"`, { cwd: repoDir });
    }

    return { repoDir, githubRepo };
  }

  async _exportDbToDisk(projectId, repoDir) {
    const files = await prisma.file.findMany({
      where: { projectId },
      select: { path: true, content: true },
    });
    for (const file of files) {
      if (!file.path) continue;
      const fPath = path.join(repoDir, file.path);
      await fs.mkdir(path.dirname(fPath), { recursive: true });
      await fs.writeFile(fPath, file.content || "", "utf-8");
    }
  }

  async _importDiskToDb(projectId, repoDir) {
    await prisma.file.deleteMany({ where: { projectId } });
    const folders = await prisma.folder.findMany({
      where: { projectId },
      select: { id: true },
      orderBy: { path: "desc" },
    });
    for (const f of folders) {
      await prisma.folder.delete({ where: { id: f.id } }).catch(() => {});
    }
    return this._importDirectory(projectId, repoDir, null);
  }

  async listBranches(projectId, userId) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    const stdout = await execPromise(`git branch -a`, { cwd: repoDir });
    const lines = stdout.split("\n").filter(Boolean).map((l) => l.trim());
    const branches = lines.map((l) => ({
      name: l.replace(/^\*?\s*/, "").replace(/^remotes\//, ""),
      current: l.startsWith("*"),
      remote: l.includes("remotes/"),
    }));
    return branches;
  }

  async createBranch(projectId, userId, { name, source }) {
    const { repoDir, githubRepo } = await this._ensureRepo(projectId, userId);
    await execPromise(`git fetch origin`, { cwd: repoDir, timeout: 60000 });
    const base = source || githubRepo.defaultBranch || "main";
    await execPromise(`git checkout ${base}`, { cwd: repoDir });
    await execPromise(`git checkout -b ${name}`, { cwd: repoDir });
    await this._exportDbToDisk(projectId, repoDir);
    log.info("Branch created", { projectId, branch: name, source: base });
    return { name, source: base };
  }

  async deleteBranch(projectId, userId, { name }) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    await execPromise(`git branch -D ${name}`, { cwd: repoDir });
    log.info("Branch deleted", { projectId, branch: name });
    return { deleted: name };
  }

  async checkoutBranch(projectId, userId, { name }) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    await execPromise(`git fetch origin ${name}`, { cwd: repoDir, timeout: 60000 }).catch(() => {});
    await execPromise(`git checkout ${name}`, { cwd: repoDir });
    await this._exportDbToDisk(projectId, repoDir);
    const stats = await this._importDiskToDb(projectId, repoDir);
    log.info("Branch checked out", { projectId, branch: name, ...stats });
    return { branch: name, ...stats };
  }

  async commit(projectId, userId, { message, files }) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    await this._exportDbToDisk(projectId, repoDir);

    if (files && files.length > 0) {
      for (const f of files) {
        await execPromise(`git add "${f}"`, { cwd: repoDir });
      }
    } else {
      await execPromise(`git add -A`, { cwd: repoDir });
    }

    const statusBefore = await execPromise(`git status --porcelain`, { cwd: repoDir });
    if (!statusBefore.trim()) {
      return { committed: false, message: "Nothing to commit", hash: null };
    }

    const hash = await execPromise(`git commit -m "${(message || "Update from NexIDE").replace(/"/g, '\\"')}"`, { cwd: repoDir });
    const commitHash = hash.match(/\[[\w-]+ ([a-f0-9]+)\]/)?.[1] || hash.trim().slice(0, 7);
    log.info("Commit created", { projectId, hash: commitHash });
    return { committed: true, hash: commitHash, message };
  }

  async push(projectId, userId, { branch, githubAccessToken }) {
    const { repoDir, githubRepo } = await this._ensureRepo(projectId, userId);
    const branchName = branch || githubRepo.defaultBranch || "main";

    if (githubAccessToken) {
      const authedUrl = `https://x-access-token:${githubAccessToken}@github.com/${githubRepo.repoFullName}.git`;
      await execPromise(`git remote set-url origin "${authedUrl}"`, { cwd: repoDir });
    }

    const result = await execPromise(`git push origin ${branchName}`, { cwd: repoDir, timeout: 120000 });
    log.info("Push completed", { projectId, branch: branchName });
    return { pushed: true, branch: branchName, result: result.trim() };
  }

  async pull(projectId, userId) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    await execPromise(`git pull --ff-only`, { cwd: repoDir, timeout: 120000 });
    const stats = await this._importDiskToDb(projectId, repoDir);
    log.info("Pull completed", { projectId, ...stats });
    return { pulled: true, ...stats };
  }

  async getStatus(projectId, userId) {
    const { repoDir } = await this._ensureRepo(projectId, userId);
    await this._exportDbToDisk(projectId, repoDir);
    const stdout = await execPromise(`git status --porcelain`, { cwd: repoDir });
    const lines = stdout.split("\n").filter(Boolean).map((l) => ({
      index: l.slice(0, 1),
      workingTree: l.slice(1, 2),
      file: l.slice(3).trim(),
    }));
    const branch = (await execPromise(`git rev-parse --abbrev-ref HEAD`, { cwd: repoDir })).trim();
    const logOutput = await execPromise(`git log --oneline -10`, { cwd: repoDir });
    const recentCommits = logOutput.split("\n").filter(Boolean).map((l) => {
      const [hash, ...msg] = l.split(" ");
      return { hash, message: msg.join(" ") };
    });
    return { branch, files: lines, recentCommits };
  }
}

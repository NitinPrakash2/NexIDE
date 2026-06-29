import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { getDocker, dockerAvailable, allocatePort, releasePort, checkDocker } from "../lib/docker.js";
import { logger } from "../config/index.js";

const memberRepository = new MemberRepository();
const MANAGER_ROLES = ["OWNER", "ADMIN"];

function generateName(projectId) {
  return `nexide-${projectId.slice(0, 8)}`;
}

export class RuntimeService {
  async list(projectId, userId) {
    await this._guardManager(projectId, userId);
    return prisma.container.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(projectId, containerId, userId) {
    await this._guardManager(projectId, userId);
    const container = await prisma.container.findUnique({ where: { id: containerId } });
    if (!container || container.projectId !== projectId) {
      throw AppError.notFound("Container not found");
    }
    return container;
  }

  async create(projectId, userId, spec) {
    await this._guardManager(projectId, userId);
    const container = await prisma.container.create({
      data: {
        projectId,
        image: spec.image,
        name: spec.name || generateName(projectId),
        containerPort: spec.containerPort,
        cpuLimit: spec.cpuLimit,
        memoryLimit: spec.memoryLimit,
        envVars: spec.envVars || undefined,
        entrypoint: spec.entrypoint,
        command: spec.command,
        status: "CREATED",
      },
    });

    logger.info("Container record created", { containerId: container.id, projectId });
    return container;
  }

  async start(projectId, containerId, userId) {
    await this._guardManager(projectId, userId);
    const container = await this.getById(projectId, containerId, userId);

    if (container.status === "RUNNING") {
      throw AppError.conflict("Container is already running");
    }

    const available = await checkDocker();
    if (!available) {
      return prisma.container.update({
        where: { id: containerId },
        data: { status: "ERROR", errorLog: "Docker is not available on this system" },
      });
    }

    const docker = getDocker();
    const port = allocatePort();

    try {
      const envArray = container.envVars
        ? Object.entries(container.envVars).map(([k, v]) => `${k}=${v}`)
        : [];

      const createOpts = {
        name: container.name || `nexide-${projectId.slice(0, 8)}`,
        Image: container.image,
        Cmd: container.command ? container.command.split(/\s+/) : undefined,
        Entrypoint: container.entrypoint ? [container.entrypoint] : undefined,
        Env: envArray.length > 0 ? envArray : undefined,
        HostConfig: {
          PortBindings: { [`${container.containerPort}/tcp`]: [{ HostPort: String(port) }] },
          NanoCPUs: parseFloat(container.cpuLimit || "0.5") * 1e9,
          Memory: parseMemory(container.memoryLimit || "512m"),
        },
        ExposedPorts: { [`${container.containerPort}/tcp`]: {} },
      };

      const dockerContainer = await docker.createContainer(createOpts);
      await dockerContainer.start();

      const dockerInfo = await dockerContainer.inspect();

      const updated = await prisma.container.update({
        where: { id: containerId },
        data: {
          status: "RUNNING",
          dockerId: dockerInfo.Id,
          assignedPort: port,
        },
      });

      logger.info("Container started", { containerId, dockerId: dockerInfo.Id, port });

      dockerContainer.wait().catch(() => {
        prisma.container.update({
          where: { id: containerId },
          data: { status: "STOPPED" },
        }).then(() => releasePort(port)).catch(() => {});
      });

      return updated;
    } catch (error) {
      releasePort(port);
      logger.error("Failed to start container", { containerId, error: error.message });
      return prisma.container.update({
        where: { id: containerId },
        data: { status: "ERROR", errorLog: error.message },
      });
    }
  }

  async stop(projectId, containerId, userId) {
    await this._guardManager(projectId, userId);
    const container = await this.getById(projectId, containerId, userId);

    if (!["RUNNING", "ERROR"].includes(container.status)) {
      throw AppError.conflict("Container is not running");
    }

    const available = await checkDocker();
    if (available && container.dockerId) {
      try {
        const docker = getDocker();
        const dc = docker.getContainer(container.dockerId);
        await dc.stop({ t: 5 });
        await dc.remove({ v: true });
      } catch (error) {
        logger.warn("Failed to stop Docker container", { containerId, error: error.message });
      }
    }

    if (container.assignedPort) releasePort(container.assignedPort);

    return prisma.container.update({
      where: { id: containerId },
      data: { status: "STOPPED", dockerId: null, assignedPort: null },
    });
  }

  async update(projectId, containerId, userId, spec) {
    await this._guardManager(projectId, userId);
    const container = await this.getById(projectId, containerId, userId);

    if (container.status === "RUNNING") {
      throw AppError.conflict("Stop the container before updating its configuration");
    }

    return prisma.container.update({
      where: { id: containerId },
      data: spec,
    });
  }

  async delete(projectId, containerId, userId) {
    await this._guardManager(projectId, userId);
    await this.stop(projectId, containerId, userId).catch(() => {});
    return prisma.container.delete({ where: { id: containerId } });
  }

  async getLogs(projectId, containerId, userId) {
    const container = await this.getById(projectId, containerId, userId);
    if (!container.dockerId) throw AppError.notFound("Container has no Docker instance");

    const available = await checkDocker();
    if (!available) throw AppError.serviceUnavailable("Docker not available");

    const docker = getDocker();
    const dc = docker.getContainer(container.dockerId);
    return dc.logs({ stdout: true, stderr: true, tail: 100 });
  }

  async getPreviewUrl(projectId, containerId, userId) {
    const container = await this.getById(projectId, containerId, userId);
    if (container.status !== "RUNNING" || !container.assignedPort) {
      throw AppError.conflict("Container is not running");
    }
    return { url: `http://localhost:${container.assignedPort}` };
  }

  async _guardManager(projectId, userId) {
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      throw AppError.forbidden("Only owners and admins can manage containers");
    }
  }
}

function parseMemory(str) {
  const match = str.match(/^(\d+)([kKmMgGtT]?[bB]?)$/);
  if (!match) return 512 * 1024 * 1024;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const units = { "": 1, k: 1024, kb: 1024, m: 1024 * 1024, mb: 1024 * 1024, g: 1024 * 1024 * 1024, gb: 1024 * 1024 * 1024 };
  return val * (units[unit] || 1);
}

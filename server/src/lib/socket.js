import { Server } from "socket.io";
import { verifyAccessToken } from "../config/jwt.js";
import { env, logger } from "../config/index.js";
import { prisma } from "./prisma.js";
import { yjsManager } from "./yjsManager.js";
import { NotificationService } from "../services/notificationService.js";
import { getDocker, dockerAvailable, checkDocker } from "./docker.js";

const notificationService = new NotificationService();

const ACTIVE_USERS = new Map();
let io = null;

function getUserKey(projectId, userId) {
  return `${projectId}:${userId}`;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 5 * 1024 * 1024,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, fullName: true, username: true, avatar: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("Socket connected", { userId: socket.user.id, socketId: socket.id });

    socket.join(`user:${socket.user.id}`);

    socket.on("join-project", async ({ projectId }) => {
      try {
        const membership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: socket.user.id } },
        });

        if (!membership) {
          socket.emit("error", { message: "You are not a member of this project" });
          return;
        }

        socket.projectId = projectId;
        socket.join(`project:${projectId}`);

        const userKey = getUserKey(projectId, socket.user.id);
        ACTIVE_USERS.set(userKey, {
          user: socket.user,
          projectId,
          socketId: socket.id,
          currentFile: null,
          joinedAt: new Date(),
        });

        io.to(`project:${projectId}`).emit("active-users", {
          users: getProjectUsers(projectId),
        });

        io.to(`project:${projectId}`).emit("user-joined", {
          user: socket.user,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to join project" });
      }
    });

    socket.on("leave-project", ({ projectId }) => {
      leaveProject(socket, projectId);
    });

    socket.on("open-file", async ({ projectId, fileId }) => {
      try {
        const file = await prisma.file.findUnique({
          where: { id: fileId, projectId },
        });

        if (!file) {
          socket.emit("error", { message: "File not found" });
          return;
        }

        await yjsManager.loadFromDb(fileId);
        socket.currentFileId = fileId;
        socket.join(`file:${fileId}`);

        const userKey = getUserKey(projectId, socket.user.id);
        const userData = ACTIVE_USERS.get(userKey);
        if (userData) {
          userData.currentFile = fileId;
        }

        const state = yjsManager.encodeStateAsUpdate(fileId);
        socket.emit("file-state", {
          fileId,
          state: Buffer.from(state).toString("base64"),
          users: getFileUsers(fileId),
        });

        socket.to(`project:${projectId}`).emit("file-opened", {
          fileId,
          user: socket.user,
        });
      } catch (error) {
        socket.emit("error", { message: "Failed to open file" });
      }
    });

    socket.on("close-file", ({ fileId }) => {
      if (socket.projectId) {
        socket.leave(`file:${fileId}`);

        const userKey = getUserKey(socket.projectId, socket.user.id);
        const userData = ACTIVE_USERS.get(userKey);
        if (userData) {
          userData.currentFile = null;
        }

        socket.to(`project:${socket.projectId}`).emit("file-closed", {
          fileId,
          user: socket.user,
        });
      }
      socket.currentFileId = null;
    });

    socket.on("yjs-sync-step1", ({ fileId, stateVector }) => {
      const sv = stateVector ? Buffer.from(stateVector, "base64") : null;
      const update = sv
        ? yjsManager.computeMissingUpdates(fileId, sv)
        : yjsManager.encodeStateAsUpdate(fileId);

      if (update) {
        socket.emit("yjs-sync-step2", {
          fileId,
          update: Buffer.from(update).toString("base64"),
        });
      }
    });

    socket.on("yjs-update", ({ fileId, update }) => {
      const updateBuffer = Buffer.from(update, "base64");
      yjsManager.applyUpdate(fileId, updateBuffer);

      socket.to(`file:${fileId}`).emit("yjs-update", {
        fileId,
        update,
        userId: socket.user.id,
      });
    });

    socket.on("awareness-update", ({ fileId, awareness }) => {
      socket.to(`file:${fileId}`).emit("awareness-update", {
        fileId,
        awareness,
        user: {
          id: socket.user.id,
          fullName: socket.user.fullName,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on("cursor-move", ({ fileId, cursor }) => {
      socket.to(`file:${fileId}`).emit("cursor-move", {
        fileId,
        cursor,
        user: socket.user,
      });
    });

    socket.on("typing", ({ fileId, isTyping }) => {
      socket.to(`file:${fileId}`).emit("typing", {
        fileId,
        isTyping,
        user: socket.user,
      });
    });

    socket.on("chat-message", async ({ projectId, message }) => {
      try {
        const membership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: socket.user.id } },
        });
        if (!membership) {
          socket.emit("error", { message: "You are not a member of this project" });
          return;
        }

        const chatMessage = await prisma.chatMessage.create({
          data: { projectId, userId: socket.user.id, message },
          include: { user: { select: { id: true, fullName: true, username: true, avatar: true } } },
        });

        prisma.chatMessage.findMany({
          where: { projectId },
          orderBy: { createdAt: "desc" },
          skip: 1000,
          select: { id: true },
        }).then(old => {
          if (old.length > 0) {
            prisma.chatMessage.deleteMany({ where: { id: { in: old.map(o => o.id) } } });
          }
        }).catch(() => {});

        io.to(`project:${projectId}`).emit("chat-message", chatMessage);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("send-notification", async ({ userId, type, title, message, data, projectId }) => {
      try {
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            title,
            message,
            data: data || undefined,
            projectId,
            actorId: socket.user.id,
          },
          include: {
            actor: { select: { id: true, fullName: true, username: true, avatar: true } },
            project: { select: { id: true, name: true, slug: true } },
          },
        });

        io.to(`user:${userId}`).emit("notification", notification);

        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });
        io.to(`user:${userId}`).emit("unread-count", { count: unreadCount });
      } catch (error) {
        logger.error("Failed to send notification", { error: error.message });
      }
    });

    socket.on("terminal-start", async ({ containerId, cols, rows }) => {
      try {
        const container = await prisma.container.findUnique({ where: { id: containerId } });
        if (!container || !container.dockerId) {
          socket.emit("terminal-error", { message: "Container not found or not running" });
          return;
        }

        const available = await checkDocker();
        if (!available) {
          socket.emit("terminal-error", { message: "Docker is not available on this system" });
          return;
        }

        const docker = getDocker();
        const dc = docker.getContainer(container.dockerId);

        const exec = await dc.exec({
          Cmd: ["/bin/sh"],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Env: ["TERM=xterm-256color"],
        });

        const stream = await exec.start({
          hijack: true,
          stdin: true,
          Tty: true,
        });

        if (cols && rows) {
          exec.resize({ h: rows, w: cols }).catch(() => {});
        }

        socket.terminalStream = stream;
        socket.terminalExec = exec;
        socket.emit("terminal-started", { containerId });

        stream.on("data", (chunk) => {
          const data = typeof chunk === "string" ? chunk : chunk.toString("base64");
          socket.emit("terminal-output", { data });
        });

        stream.on("end", () => {
          socket.emit("terminal-ended", { containerId });
          socket.terminalStream = null;
          socket.terminalExec = null;
        });

        stream.on("error", (error) => {
          socket.emit("terminal-error", { message: error.message });
          socket.terminalStream = null;
          socket.terminalExec = null;
        });

        socket.on("terminal-input", ({ data }) => {
          if (socket.terminalStream) {
            socket.terminalStream.write(data);
          }
        });

        socket.on("terminal-resize", ({ cols, rows }) => {
          if (socket.terminalExec) {
            socket.terminalExec.resize({ h: rows, w: cols }).catch(() => {});
          }
        });
      } catch (error) {
        logger.error("Terminal start failed", { error: error.message });
        socket.emit("terminal-error", { message: error.message });
      }
    });

    socket.on("terminal-input", ({ data }) => {
      if (socket.terminalStream) {
        socket.terminalStream.write(data);
      }
    });

    socket.on("terminal-resize", ({ cols, rows }) => {
      if (socket.terminalExec) {
        socket.terminalExec.resize({ h: rows, w: cols }).catch(() => {});
      }
    });

    socket.on("terminal-stop", () => {
      if (socket.terminalStream) {
        try { socket.terminalStream.end(); } catch {}
        socket.terminalStream = null;
      }
      socket.terminalExec = null;
    });

    socket.on("disconnect", () => {
      logger.info("Socket disconnected", {
        userId: socket.user.id,
        socketId: socket.id,
      });

      if (socket.terminalStream) {
        try { socket.terminalStream.end(); } catch {}
        socket.terminalStream = null;
      }
      socket.terminalExec = null;

      if (socket.projectId) {
        leaveProject(socket, socket.projectId);
      }
    });
  });

  return io;
}

function leaveProject(socket, projectId) {
  const userKey = getUserKey(projectId, socket.user.id);
  ACTIVE_USERS.delete(userKey);

  socket.leave(`project:${projectId}`);
  if (socket.currentFileId) {
    socket.leave(`file:${socket.currentFileId}`);
  }

  io.to(`project:${projectId}`).emit("user-left", {
    user: socket.user,
    timestamp: new Date().toISOString(),
  });

  io.to(`project:${projectId}`).emit("active-users", {
    users: getProjectUsers(projectId),
  });
}

function getProjectUsers(projectId) {
  const users = [];
  for (const [, data] of ACTIVE_USERS) {
    if (data.projectId === projectId) {
      users.push({
        user: data.user,
        currentFile: data.currentFile,
        joinedAt: data.joinedAt,
      });
    }
  }
  return users;
}

function getFileUsers(fileId) {
  const users = [];
  for (const [, data] of ACTIVE_USERS) {
    if (data.currentFile === fileId) {
      users.push({
        user: data.user,
        joinedAt: data.joinedAt,
      });
    }
  }
  return users;
}

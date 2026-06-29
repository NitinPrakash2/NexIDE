import Docker from "dockerode";
import { logger } from "../config/index.js";

let docker = null;
let isAvailable = false;

const DOCKER_OPTS = { socketPath: process.env.DOCKER_SOCKET || "//./pipe/docker_engine" };

export function initDocker() {
  try {
    docker = new Docker(DOCKER_OPTS);
    isAvailable = true;
    logger.info("Docker client initialized");
  } catch (error) {
    docker = null;
    isAvailable = false;
    logger.warn("Docker not available — runtime features will be disabled", { error: error.message });
  }
}

export function getDocker() {
  if (!isAvailable || !docker) {
    throw new Error("Docker is not available on this system");
  }
  return docker;
}

export function dockerAvailable() {
  return isAvailable;
}

export async function checkDocker() {
  if (!isAvailable || !docker) return false;
  try {
    await docker.ping();
    return true;
  } catch {
    isAvailable = false;
    return false;
  }
}

export const PORT_RANGE = { start: 40000, end: 49999 };
const allocatedPorts = new Set();

export function allocatePort() {
  const used = allocatedPorts;
  for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port++) {
    if (!used.has(port)) {
      used.add(port);
      return port;
    }
  }
  throw new Error("No available ports");
}

export function releasePort(port) {
  allocatedPorts.delete(port);
}

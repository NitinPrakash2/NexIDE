import { prisma } from "../lib/prisma.js";
import { GithubService } from "./githubService.js";
import { log } from "../helpers/logger.js";
import crypto from "crypto";

const githubService = new GithubService();

function verifySignature(payload, signature, secret) {
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expected = `sha256=${hmac.digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function handleWebhook(event, payload, signature, rawBody) {
  if (event === "ping") {
    return { message: "pong" };
  }

  if (event !== "push") {
    return { message: `Unsupported event: ${event}` };
  }

  const repoFullName = payload.repository?.full_name;
  if (!repoFullName) {
    throw new Error("Missing repository full_name in payload");
  }

  const githubRepo = await prisma.githubRepo.findUnique({
    where: { repoFullName },
  });

  if (!githubRepo) {
    return { message: `No linked project found for ${repoFullName}` };
  }

  if (githubRepo.webhookSecret) {
    if (!verifySignature(rawBody || JSON.stringify(payload), signature, githubRepo.webhookSecret)) {
      throw new Error("Invalid webhook signature");
    }
  }

  log.info("Webhook push event received", {
    repoFullName,
    ref: payload.ref,
    projectId: githubRepo.projectId,
  });

  await githubService.syncRepository(githubRepo.userId, githubRepo.projectId);

  return {
    message: "Repository synced",
    projectId: githubRepo.projectId,
  };
}

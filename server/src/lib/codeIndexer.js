import { prisma } from "./prisma.js";
import { logger } from "../config/index.js";

const projectIndexes = new Map();

const CHUNK_LINES = 50;
const MAX_CHUNKS = 8;
const MAX_CACHE = 100;

function splitIntoChunks(content, filePath) {
  const lines = content.split("\n");
  const chunks = [];
  for (let i = 0; i < lines.length; i += CHUNK_LINES) {
    const slice = lines.slice(i, i + CHUNK_LINES);
    chunks.push({
      filePath,
      startLine: i + 1,
      endLine: Math.min(i + CHUNK_LINES, lines.length),
      content: slice.join("\n"),
    });
  }
  return chunks;
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9_$]+/g, " ").split(" ").filter(Boolean);
}

function computeRelevanceScore(chunk, queryTokens) {
  const chunkTokens = tokenize(chunk.content);
  const chunkSet = new Set(chunkTokens);
  let score = 0;

  for (const qt of queryTokens) {
    if (chunkSet.has(qt)) score += 1;
    if (chunk.content.toLowerCase().includes(qt)) score += 0.5;
  }

  const fileLower = chunk.filePath.toLowerCase();
  for (const qt of queryTokens) {
    if (fileLower.includes(qt)) score += 2;
  }

  return score;
}

export async function indexProject(projectId) {
  if (projectIndexes.size >= MAX_CACHE) {
    const key = projectIndexes.keys().next().value;
    projectIndexes.delete(key);
    logger.info("Evicted project index from cache", { projectId: key });
  }

  if (projectIndexes.has(projectId)) return;

  const files = await prisma.file.findMany({
    where: { projectId },
    select: { path: true, content: true },
  });

  if (files.length === 0) return;

  const allChunks = [];
  for (const file of files) {
    if (file.content) {
      allChunks.push(...splitIntoChunks(file.content, file.path));
    }
  }

  projectIndexes.set(projectId, allChunks);
  logger.info("Indexed project files for RAG", { projectId, chunks: allChunks.length, files: files.length });
}

export function searchRelevantChunks(projectId, query, maxChunks = MAX_CHUNKS) {
  const chunks = projectIndexes.get(projectId);
  if (!chunks || chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = chunks
    .map((c) => ({ ...c, score: computeRelevanceScore(c, queryTokens) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxChunks);
}

export function clearProjectIndex(projectId) {
  projectIndexes.delete(projectId);
  logger.info("Cleared project index", { projectId });
}

export async function buildRagContext(projectId, query) {
  if (!projectId || !query) return null;

  await indexProject(projectId);
  const relevantChunks = searchRelevantChunks(projectId, query);

  if (relevantChunks.length === 0) return null;

  const sections = relevantChunks.map(
    (c) => `File: ${c.filePath} (lines ${c.startLine}-${c.endLine})\n\`\`\`\n${c.content}\n\`\`\``
  );

  return `Relevant code from your project:\n\n${sections.join("\n\n")}`;
}

export function getIndexStats(projectId) {
  const chunks = projectIndexes.get(projectId);
  return chunks ? { indexed: true, chunks: chunks.length } : { indexed: false, chunks: 0 };
}

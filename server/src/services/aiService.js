import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/appError.js";
import { logger } from "../config/index.js";
import { chatCompletion, chatCompletionStream, aiAvailable } from "../lib/ai.js";
import { MemberRepository } from "../repositories/memberRepository.js";
import { buildRagContext, clearProjectIndex } from "../lib/codeIndexer.js";

const memberRepository = new MemberRepository();

export class AiService {
  async createConversation(userId, data) {
    return prisma.aiConversation.create({
      data: { userId, projectId: data.projectId, title: data.title, model: data.model },
    });
  }

  async listConversations(userId, projectId) {
    const where = { userId };
    if (projectId) where.projectId = projectId;
    return prisma.aiConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  }

  async getConversation(conversationId, userId) {
    const conv = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) throw AppError.notFound("Conversation not found");
    if (conv.userId !== userId) throw AppError.forbidden("Not your conversation");
    return conv;
  }

  async updateConversation(conversationId, userId, data) {
    const conv = await this.getConversation(conversationId, userId);
    return prisma.aiConversation.update({ where: { id: conversationId }, data });
  }

  async deleteConversation(conversationId, userId) {
    const conv = await this.getConversation(conversationId, userId);
    return prisma.aiConversation.delete({ where: { id: conversationId } });
  }

  async _guardProjectAccess(projectId, userId) {
    if (!projectId) return;
    const membership = await memberRepository.findByProjectAndUser(projectId, userId);
    if (!membership) throw AppError.forbidden("You are not a member of this project");
  }

  async _loadFileContext(projectId) {
    if (!projectId) return null;
    const files = await prisma.file.findMany({
      where: { projectId },
      select: { path: true, name: true },
      take: 30,
      orderBy: { path: "asc" },
    });
    if (files.length === 0) return null;
    return files.map((f) => `  ${f.path}`).join("\n");
  }

  async _saveMessage(conversationId, role, content, tokens) {
    return prisma.aiMessage.create({
      data: { conversationId, role, content, tokens },
    });
  }

  async _getHistory(conversationId) {
    if (!conversationId) return [];
    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async chat(userId, { conversationId, message, projectId, type = "chat", code, language, errorMessage }) {
    await this._guardProjectAccess(projectId, userId);
    const fileContext = await this._loadFileContext(projectId);
    const ragContext = await buildRagContext(projectId, message || code);

    if (!aiAvailable()) {
      return {
        content: "AI is not configured. Ask your administrator to set the GEMINI_API_KEY (free) or OPENAI_API_KEY environment variable.",
        role: "assistant",
        conversationId: null,
      };
    }

    let conv = null;
    if (conversationId) {
      conv = await this.getConversation(conversationId, userId);
    } else {
      conv = await this.createConversation(userId, {
        projectId,
        title: message.slice(0, 100),
      });
    }

    const history = await this._getHistory(conv.id);

    const userMessages = [...history];
    if (message && (type === "chat" || !code)) {
      userMessages.push({ role: "user", content: message });
    }

    let result;
    try {
      result = await chatCompletion({
        type,
        messages: userMessages,
        code,
        language,
        errorMessage,
        fileContext,
        ragContext,
        model: conv.model,
      });
    } catch (error) {
      logger.error("All AI providers failed", { error: error.message });
      result = {
        content: `AI service is currently unavailable. Please try again later.`,
        role: "assistant",
        tokens: 0,
      };
    }

    await this._saveMessage(conv.id, "user", message || code, 0);
    await this._saveMessage(conv.id, result.role, result.content, result.tokens);

    await prisma.aiConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return { ...result, conversationId: conv.id };
  }

  async *chatStream(userId, { conversationId, message, projectId, type = "chat", code, language, errorMessage }) {
    await this._guardProjectAccess(projectId, userId);
    const fileContext = await this._loadFileContext(projectId);
    const ragContext = await buildRagContext(projectId, message || code);

    if (!aiAvailable()) {
      yield {
        content: "AI is not configured. Ask your administrator to set the GEMINI_API_KEY (free) or OPENAI_API_KEY environment variable.",
        done: true,
        conversationId: null,
      };
      return;
    }

    let conv = null;
    if (conversationId) {
      conv = await this.getConversation(conversationId, userId);
    } else {
      conv = await this.createConversation(userId, {
        projectId,
        title: (message || code || "").slice(0, 100),
      });
    }

    const history = await this._getHistory(conv.id);
    const userMessages = [...history];
    if (message && (type === "chat" || !code)) {
      userMessages.push({ role: "user", content: message });
    }

    const stream = chatCompletionStream({
      type,
      messages: userMessages,
      code,
      language,
      errorMessage,
      fileContext,
      ragContext,
      model: conv.model,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      fullContent += chunk.content;
      yield { ...chunk, conversationId: conv.id };
    }

    await this._saveMessage(conv.id, "user", message || code || "", 0);
    await this._saveMessage(conv.id, "assistant", fullContent, 0);

    await prisma.aiConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });
  }
}

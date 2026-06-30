import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, logger } from "../config/index.js";

let provider = null;
let providerType = null;
let isAvailable = false;

const SYSTEM_PROMPTS = {
  default: `You are NexAI, an expert programming assistant integrated into the NexIDE cloud IDE. 
You help users write, understand, debug, and refactor code. 
Provide concise, correct, and well-explained answers. Always format code blocks with proper language tags.`,

  generate: `You are a code generation expert. Generate clean, production-ready code based on the user's description. 
Include necessary imports and follow best practices for the specified language/framework.`,

  explain: `You are a code explanation expert. Explain the provided code clearly and concisely. 
Break down complex logic, identify patterns used, and note any potential issues or improvements.`,

  refactor: `You are a code refactoring expert. Suggest improvements to the provided code focusing on:
- Readability and maintainability
- Performance optimization  
- Security best practices
- Modern language features
Provide the refactored code and explain each significant change.`,

  debug: `You are a debugging expert. Analyze the provided code and error message to identify the root cause.
Suggest fixes with corrected code. Explain why the error occurred and how the fix resolves it.`,
};

export function initAi() {
  const geminiKey = env.GEMINI_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      provider = new GoogleGenerativeAI(geminiKey);
      providerType = "gemini";
      isAvailable = true;
      logger.info("AI provider initialized: Google Gemini");
      return;
    } catch (error) {
      logger.warn("Gemini initialization failed", { error: error.message });
    }
  }

  if (openaiKey) {
    try {
      provider = new OpenAI({ apiKey: openaiKey });
      providerType = "openai";
      isAvailable = true;
      logger.info("AI provider initialized: OpenAI");
      return;
    } catch (error) {
      logger.warn("OpenAI initialization failed", { error: error.message });
    }
  }

  isAvailable = false;
  provider = null;
  providerType = null;
  logger.warn("No AI API key configured (try GEMINI_API_KEY for free tier) — AI features will be unavailable");
}

export function aiAvailable() {
  return isAvailable && provider !== null;
}

function getSystemPrompt(type = "default") {
  return SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.default;
}

function buildMessages({ type, messages, code, language, errorMessage, fileContext }) {
  const system = getSystemPrompt(type);
  const result = [{ role: "system", content: system }];

  if (fileContext) {
    result.push({
      role: "system",
      content: `The user is working on a project with the following files:\n${fileContext}`,
    });
  }

  if (code && type !== "chat") {
    const lang = language || "code";
    if (type === "explain") {
      result.push({ role: "user", content: `Explain this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`` });
    } else if (type === "refactor") {
      result.push({ role: "user", content: `Refactor this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`` });
    } else if (type === "debug") {
      const error = errorMessage ? `\nError message: ${errorMessage}` : "";
      result.push({ role: "user", content: `Debug this ${lang} code:${error}\n\`\`\`${lang}\n${code}\n\`\`\`` });
    } else if (type === "generate") {
      result.push({ role: "user", content: `Generate ${lang} code: ${code}` });
    }
    return result;
  }

  if (messages && messages.length > 0) {
    result.push(...messages);
  }

  return result;
}

function toGeminiHistory(messages) {
  const history = [];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    history.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  return history;
}

async function geminiCompletion({ system, messages, model, temperature }) {
  const genModel = provider.getGenerativeModel({
    model: model || env.GEMINI_MODEL,
    systemInstruction: system,
    generationConfig: { temperature: temperature ?? 0.7 },
  });

  const history = toGeminiHistory(messages);
  const lastMsg = history.pop();
  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts[0].text);

  const response = result.response;
  return {
    content: response.text(),
    role: "assistant",
    tokens: response.usageMetadata?.totalTokenCount || 0,
    model: model || env.GEMINI_MODEL,
  };
}

async function* geminiStream({ system, messages, model, temperature }) {
  const genModel = provider.getGenerativeModel({
    model: model || env.GEMINI_MODEL,
    systemInstruction: system,
    generationConfig: { temperature: temperature ?? 0.7 },
  });

  const history = toGeminiHistory(messages);
  const lastMsg = history.pop();
  const chat = genModel.startChat({ history });
  const result = await chat.sendMessageStream(lastMsg.parts[0].text);

  let fullContent = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullContent += text;
      yield { content: text, done: false };
    }
  }

  yield {
    content: fullContent,
    done: true,
    role: "assistant",
    tokens: 0,
    model: model || env.GEMINI_MODEL,
  };
}

export async function chatCompletion({ type = "chat", messages, code, language, errorMessage, fileContext, model }) {
  if (!aiAvailable()) {
    throw new Error("AI is not available. Configure GEMINI_API_KEY or OPENAI_API_KEY in environment.");
  }

  const msgs = buildMessages({ type, messages, code, language, errorMessage, fileContext });
  const system = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const chatMessages = msgs.filter((m) => m.role !== "system");

  if (providerType === "gemini") {
    return geminiCompletion({ system, messages: chatMessages, model, temperature: type === "generate" ? 0.3 : 0.7 });
  }

  const modelName = model || env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await provider.chat.completions.create({
    model: modelName,
    messages: msgs,
    temperature: type === "generate" ? 0.3 : 0.7,
  });

  const choice = response.choices[0];
  return {
    content: choice.message.content,
    role: "assistant",
    tokens: response.usage?.total_tokens || 0,
    model: modelName,
  };
}

export async function* chatCompletionStream({ type = "chat", messages, code, language, errorMessage, fileContext, model }) {
  if (!aiAvailable()) {
    throw new Error("AI is not available. Configure GEMINI_API_KEY or OPENAI_API_KEY in environment.");
  }

  const msgs = buildMessages({ type, messages, code, language, errorMessage, fileContext });

  if (providerType === "gemini") {
    const system = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const chatMessages = msgs.filter((m) => m.role !== "system");
    yield* geminiStream({ system, messages: chatMessages, model, temperature: type === "generate" ? 0.3 : 0.7 });
    return;
  }

  const modelName = model || env.OPENAI_MODEL || "gpt-4o-mini";
  const stream = await provider.chat.completions.create({
    model: modelName,
    messages: msgs,
    temperature: type === "generate" ? 0.3 : 0.7,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      fullContent += delta;
      yield { content: delta, done: false };
    }
  }

  yield {
    content: fullContent,
    done: true,
    role: "assistant",
    tokens: 0,
    model: modelName,
  };
}

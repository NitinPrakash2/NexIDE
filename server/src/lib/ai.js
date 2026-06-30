import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, logger } from "../config/index.js";

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

const providers = [];

function _register(type, client, priority) {
  providers.push({ type, client, priority });
  logger.info(`AI provider registered: ${type} (priority ${priority})`);
}

export async function initAi() {
  providers.length = 0;

  if (env.GEMINI_API_KEY) {
    try {
      _register("gemini", new GoogleGenerativeAI(env.GEMINI_API_KEY), 1);
    } catch (e) {
      logger.warn("Gemini init failed", { error: e.message });
    }
  }

  if (env.GROQ_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
      _register("groq", client, 2);
    } catch (e) {
      logger.warn("Groq init failed", { error: e.message });
    }
  }

  if (env.OPENROUTER_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" });
      _register("openrouter", client, 3);
    } catch (e) {
      logger.warn("OpenRouter init failed", { error: e.message });
    }
  }

  if (env.MISTRAL_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: env.MISTRAL_API_KEY, baseURL: "https://api.mistral.ai/v1" });
      _register("mistral", client, 4);
    } catch (e) {
      logger.warn("Mistral init failed", { error: e.message });
    }
  }

  if (providers.length === 0) {
    logger.warn("No AI provider available — AI features will be unavailable");
  }
}

export function aiAvailable() {
  return providers.length > 0;
}

export function getProviderList() {
  return providers.map(p => ({ type: p.type, priority: p.priority }));
}

function getSystemPrompt(type = "default") {
  return SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.default;
}

function buildMessages({ type, messages, code, language, errorMessage, fileContext, ragContext }) {
  const system = getSystemPrompt(type);
  const result = [{ role: "system", content: system }];

  if (fileContext) {
    result.push({
      role: "system",
      content: `The user is working on a project with the following files:\n${fileContext}`,
    });
  }

  if (ragContext) {
    result.push({
      role: "system",
      content: `Here is relevant code from the user's project to help answer their question:\n${ragContext}`,
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

function _modelFor(type, model) {
  const valid = model && !model.includes("gpt") && !model.includes("gpt") && model !== "gpt-4o-mini";
  if (type === "gemini") return valid ? model : undefined;
  if (type === "groq") return valid ? model : env.GROQ_MODEL;
  if (type === "openrouter") return valid ? model : env.OPENROUTER_MODEL;
  if (type === "mistral") return valid ? model : env.MISTRAL_MODEL;
  return model;
}

async function geminiCompletion(client, { system, messages, model, temperature }) {
  const genModel = client.getGenerativeModel({
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

async function* geminiStream(client, { system, messages, model, temperature }) {
  const genModel = client.getGenerativeModel({
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
    content: fullContent, done: true, role: "assistant", tokens: 0, model: model || env.GEMINI_MODEL,
  };
}

async function openaiCompletion(client, { messages, model, temperature }) {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: temperature ?? 0.7,
  });
  const choice = response.choices[0];
  return {
    content: choice.message.content,
    role: "assistant",
    tokens: response.usage?.total_tokens || 0,
    model,
  };
}

async function* openaiStream(client, { messages, model, temperature }) {
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: temperature ?? 0.7,
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
    content: fullContent, done: true, role: "assistant", tokens: 0, model,
  };
}

function shouldFallback(err) {
  const msg = (err.message || "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")
    || msg.includes("503") || msg.includes("502") || msg.includes("401") || msg.includes("404")
    || msg.includes("403") || msg.includes("insufficient") || msg.includes("no content")
    || msg.includes("does not exist") || msg.includes("not found");
}

export async function chatCompletion({ type = "chat", messages, code, language, errorMessage, fileContext, ragContext, model }) {
  const msgs = buildMessages({ type, messages, code, language, errorMessage, fileContext, ragContext });
  const system = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const chatMessages = msgs.filter((m) => m.role !== "system");
  const temperature = type === "generate" ? 0.3 : 0.7;

  let lastError = null;
  for (const prov of providers) {
    const resolvedModel = _modelFor(prov.type, model);
    try {
      if (prov.type === "gemini") {
        return await geminiCompletion(prov.client, { system, messages: chatMessages, model: resolvedModel, temperature });
      }
      return await openaiCompletion(prov.client, { messages: msgs, model: resolvedModel, temperature });
    } catch (error) {
      lastError = error;
      logger.warn(`AI "${prov.type}" failed, trying next`, { error: error.message });
      if (!shouldFallback(error)) throw error;
    }
  }

  throw lastError || new Error("All AI providers failed");
}

export async function* chatCompletionStream({ type = "chat", messages, code, language, errorMessage, fileContext, ragContext, model }) {
  const msgs = buildMessages({ type, messages, code, language, errorMessage, fileContext, ragContext });
  const system = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const chatMessages = msgs.filter((m) => m.role !== "system");
  const temperature = type === "generate" ? 0.3 : 0.7;

  let lastError = null;
  for (const prov of providers) {
    const resolvedModel = _modelFor(prov.type, model);
    try {
      if (prov.type === "gemini") {
        yield* geminiStream(prov.client, { system, messages: chatMessages, model: resolvedModel, temperature });
      } else {
        yield* openaiStream(prov.client, { messages: msgs, model: resolvedModel, temperature });
      }
      return;
    } catch (error) {
      lastError = error;
      logger.warn(`AI stream "${prov.type}" failed, trying next`, { error: error.message });
      if (!shouldFallback(error)) throw error;
    }
  }

  throw lastError || new Error("All AI providers failed");
}

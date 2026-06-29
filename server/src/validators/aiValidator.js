import { z } from "zod";

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000).trim(),
  projectId: z.string().uuid().optional(),
});

export const codeActionSchema = z.object({
  code: z.string().min(1).max(50000),
  language: z.string().optional(),
  errorMessage: z.string().optional(),
  projectId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
});

export const createConversationSchema = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional().default("New conversation"),
  model: z.string().optional().default("gpt-4o-mini"),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

import { z } from "zod";

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

import { z } from "zod";

export const createContainerSchema = z.object({
  image: z.string().min(1).max(200).optional().default("node:18-alpine"),
  name: z.string().min(1).max(100).optional(),
  containerPort: z.coerce.number().int().positive().max(65535).optional().default(3000),
  cpuLimit: z.string().optional().default("0.5"),
  memoryLimit: z.string().optional().default("512m"),
  envVars: z.record(z.string()).optional(),
  entrypoint: z.string().optional(),
  command: z.string().optional(),
});

export const updateContainerSchema = z.object({
  cpuLimit: z.string().optional(),
  memoryLimit: z.string().optional(),
  envVars: z.record(z.string()).optional(),
});

export const containerIdParamSchema = z.object({
  containerId: z.string().uuid("Invalid container ID"),
});

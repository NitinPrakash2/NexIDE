import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      { message: "DATABASE_URL must be a valid PostgreSQL connection string" }
    ),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  COOKIE_SECRET: z
    .string()
    .min(32, "COOKIE_SECRET must be at least 32 characters long"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "debug", "verbose"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment variable validation failed:");
  const formatted = parsed.error.format();
  for (const [key, message] of Object.entries(formatted)) {
    if (key === "_errors") continue;
    console.error(`  - ${key}: ${JSON.stringify(message)}`);
  }
  process.exit(1);
}

export const env = Object.freeze({
  NODE_ENV: parsed.data.NODE_ENV,
  PORT: parsed.data.PORT,
  DATABASE_URL: parsed.data.DATABASE_URL,
  CLIENT_URL: parsed.data.CLIENT_URL,
  COOKIE_SECRET: parsed.data.COOKIE_SECRET,
  LOG_LEVEL: parsed.data.LOG_LEVEL,
  IS_PRODUCTION: parsed.data.NODE_ENV === "production",
  IS_DEVELOPMENT: parsed.data.NODE_ENV === "development",
  IS_TEST: parsed.data.NODE_ENV === "test",
});

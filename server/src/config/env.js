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

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
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

  JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: parsed.data.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: parsed.data.JWT_REFRESH_EXPIRES_IN,

  GOOGLE_CLIENT_ID: parsed.data.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: parsed.data.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: parsed.data.GOOGLE_CALLBACK_URL,

  GITHUB_CLIENT_ID: parsed.data.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: parsed.data.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: parsed.data.GITHUB_CALLBACK_URL,
  GITHUB_APP_ID: parsed.data.GITHUB_APP_ID,
  GITHUB_PRIVATE_KEY: parsed.data.GITHUB_PRIVATE_KEY,
  GITHUB_WEBHOOK_SECRET: parsed.data.GITHUB_WEBHOOK_SECRET,

  OPENAI_API_KEY: parsed.data.OPENAI_API_KEY,
  OPENAI_MODEL: parsed.data.OPENAI_MODEL,
});

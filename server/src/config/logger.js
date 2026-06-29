import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import { env } from "./env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.resolve(__dirname, "..", "logs");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "nexide-server" },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

if (env.IS_PRODUCTION) {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, "production.log"),
      maxsize: 10485760,
      maxFiles: 10,
    })
  );
}

if (!env.IS_PRODUCTION) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: env.LOG_LEVEL,
    })
  );
}

export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

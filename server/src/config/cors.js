import { env } from "./env.js";

const allowedOrigins = [env.CLIENT_URL];

if (env.IS_DEVELOPMENT) {
  allowedOrigins.push("http://localhost:3000", "http://localhost:5173", "http://localhost:4173");
}

export const corsConfig = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["Set-Cookie", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  credentials: true,
  maxAge: 86400,
};

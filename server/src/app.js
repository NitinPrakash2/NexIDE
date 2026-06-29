import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env, corsConfig, globalRateLimiter, morganStream } from "./config/index.js";
import { errorHandler, notFoundHandler, requestId } from "./middlewares/index.js";
import routes from "./routes/index.js";

const app = express();

app.use(requestId);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

app.use(cors(corsConfig));

app.use(compression());

app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(env.COOKIE_SECRET));

app.use(globalRateLimiter);

if (!env.IS_TEST) {
  app.use(morgan("combined", { stream: morganStream }));
}

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

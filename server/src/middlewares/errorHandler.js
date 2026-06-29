import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/appError.js";
import { ErrorResponse } from "../utils/errorResponse.js";

const handlePrismaError = (error) => {
  if (error.code === "P2002") {
    return AppError.conflict("A record with this value already exists");
  }
  if (error.code === "P2025") {
    return AppError.notFound("Record not found");
  }
  if (error.code === "P2003") {
    return AppError.badRequest("Invalid reference: related record not found");
  }
  if (error.code === "P2014") {
    return AppError.badRequest("Invalid ID format");
  }
  return AppError.internal("Database error");
};

const handleValidationError = (error) => {
  return AppError.unprocessable("Validation failed", error.errors);
};

const handleCastError = () => {
  return AppError.badRequest("Invalid data format");
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.name === "PrismaClientKnownRequestError") {
    error = handlePrismaError(err);
  }

  if (err.name === "PrismaClientValidationError") {
    error = AppError.badRequest("Invalid data provided");
  }

  if (err.name === "ZodError") {
    error = handleValidationError(err);
  }

  if (err.name === "CastError") {
    error = handleCastError();
  }

  if (err.name === "JsonWebTokenError") {
    error = AppError.unauthorized("Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = AppError.unauthorized("Token has expired");
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    error = AppError.badRequest("File too large");
  }

  if (!error.isOperational) {
    logger.error("Unexpected error:", {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    if (env.IS_PRODUCTION) {
      error = AppError.internal("Internal server error");
    }
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (env.IS_DEVELOPMENT) {
    logger.error(`${req.method} ${req.originalUrl} - ${message}`, {
      statusCode,
      stack: err.stack,
    });
  }

  const errorResponse = new ErrorResponse(
    statusCode,
    message,
    env.IS_DEVELOPMENT ? error.details || err.stack : error.details
  );

  errorResponse.send(res);
};

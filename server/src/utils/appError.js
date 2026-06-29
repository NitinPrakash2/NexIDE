export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = "Unauthorized access") {
    return new AppError(401, message);
  }

  static forbidden(message = "Forbidden access") {
    return new AppError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }

  static unprocessable(message, details) {
    return new AppError(422, message, details);
  }

  static tooManyRequests(message = "Too many requests") {
    return new AppError(429, message);
  }

  static internal(message = "Internal server error") {
    return new AppError(500, message);
  }
}

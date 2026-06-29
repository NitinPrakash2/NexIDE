import { AppError } from "../utils/appError.js";

export const notFoundHandler = (req, res, next) => {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
};

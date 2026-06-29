import { AppError } from "../utils/appError.js";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      throw AppError.unprocessable("Validation failed", errors);
    }

    if (source === "params") {
      req[source] = { ...req[source], ...result.data };
    } else {
      req[source] = result.data;
    }
    next();
  };
};

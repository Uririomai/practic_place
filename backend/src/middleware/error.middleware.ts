import type { Request, Response, NextFunction } from "express";

import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  }

  logger.error(err.message, { stack: err.stack });

  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
}

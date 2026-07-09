import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// ponytail: one middleware, no morgan dependency
export function accessLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
import { verifyToken } from "../lib/jwt.js";
import type { Request, Response, NextFunction } from "express";
import type { $Enums } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: { sub: string; email?: string; role?: $Enums.UserRole };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);

  const token = header.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.sendStatus(401);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userRole = req.user?.role;

    if (userRole !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    next();
  } catch (e) {
    next(e);
  }
}


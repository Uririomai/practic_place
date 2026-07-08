import type { $Enums } from "@prisma/client";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET!;
if (!secret) throw new Error("JWT_SECRET missing");

export type JwtPayload = {
  sub: string;
  email?: string;
  role?: $Enums.UserRole
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, {
    expiresIn: "7d",
    issuer: "app",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { $Enums } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { createUser } from "../services/users.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password)
      throw new AppError("EMAIL_OR_PASSWORD_NOT_SPECIFIED", 400, "Email and password are required")

    const user = await createUser(email, password, $Enums.UserRole.STUDENT)

    res.json({
      user: { id: user.id, email: user.email },
      token: signToken({ sub: user.id, email: user.email, role: user.role }),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      throw new AppError("EMAIL_OR_PASSWORD_NOT_SPECIFIED", 400, "email and password are required")
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.bcryptPassword) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Email or password is incorrect")
    }

    const ok = await bcrypt.compare(password, user.bcryptPassword);
    if (!ok) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Email or password is incorrect")
    }

    res.json({
      user: { id: user.id, email: user.email },
      token: signToken({ sub: user.id, email: user.email, role: user.role }),
    });
  } catch (e) {
    next(e);
  }
});

export default router;

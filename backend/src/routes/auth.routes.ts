import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "user exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        bcryptPassword: hashed,
      },
    });

    res.json({
      user: { id: user.id, email: user.email },
      token: signToken({ sub: user.id, email: user.email }),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.bcryptPassword) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.bcryptPassword);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    res.json({
      user: { id: user.id, email: user.email },
      token: signToken({ sub: user.id, email: user.email }),
    });
  } catch (e) {
    next(e);
  }
});

export default router;

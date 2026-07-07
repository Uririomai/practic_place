import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
    });
    if (!user) return res.status(404).json({ error: "user not found" });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      activeCohortId: user.activeCohortId,
      createdAt: user.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/", async (req, res, next) => {
  try {
    const { activeCohortId } = req.body;
    const data: Record<string, unknown> = {};

    if (activeCohortId !== undefined) data.activeCohortId = activeCohortId;

    const user = await prisma.user.update({
      where: { id: req.user!.sub },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        activeCohortId: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
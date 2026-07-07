import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /me:
 *   get:
 *     tags: [Profile]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @openapi
 * /me:
 *   patch:
 *     tags: [Profile]
 *     summary: Update current user profile (set activeCohortId)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activeCohortId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
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
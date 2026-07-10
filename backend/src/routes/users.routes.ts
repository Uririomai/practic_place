import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.middleware.js";
import { AppError } from "../lib/errors.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        activeCohortId: true,
        profile: true,
      },
    });

    if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found");

    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               profile:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated user
 *       403:
 *         description: Can only update own profile
 *       404:
 *         description: User not found
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user!.sub;

    // ponytail: students update only themselves, admins update anyone
    if (userId !== targetId && req.user!.role !== "ADMIN")
      throw new AppError("FORBIDDEN", 403, "Can only update own profile");

    const { email, profile } = req.body;

    const data: Record<string, unknown> = {};
    if (email !== undefined) {
      if (req.user!.role !== "ADMIN") throw new AppError("FORBIDDEN", 403, "Only admins can change email");
      data.email = email;
    }
    // ponytail: merge profile instead of replace — spread existing into new
    if (profile !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { id: targetId },
        select: { profile: true },
      });
      data.profile = { ...(existing?.profile as Record<string, unknown> ?? {}), ...profile };
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        activeCohortId: true,
        profile: true,
      },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin only
 *       404:
 *         description: User not found
 */
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found");

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { AppError } from "../lib/errors.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /me:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: UserProfile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get("/", (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.sendStatus(401);
  res.redirect(301, `/users/${userId}/profile`);
});


/**
 * @openapi
 * /me:
 *   patch:
 *     tags:
 *       - Profile
 *     summary: Change active cohort
 *     description: Changes admin working cohort context.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activeCohortId
 *             properties:
 *               activeCohortId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated profile
 *       403:
 *         description: Only admin can change context
 *       404:
 *         description: Cohort not found
 */
router.patch("/", async (req, res, next) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError(
        "UNAUTHORIZED",
        401,
        "Unauthorized",
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError(
        "USER_NOT_FOUND",
        404,
        "User not found",
      );
    }

    if (user.role !== "ADMIN") {
      throw new AppError(
        "FORBIDDEN",
        403,
        "Only admins can change active cohort",
      );
    }

    const { activeCohortId } = req.body;

    const cohort = await prisma.cohort.findUnique({
      where: {
        id: activeCohortId,
      },
    });

    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        activeCohortId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        activeCohortId: true,
        activeCohort: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updatedUser);
  } catch (e) {
    next(e);
  }
});

export default router;

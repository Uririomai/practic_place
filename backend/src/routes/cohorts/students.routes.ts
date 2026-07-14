import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /cohorts/{cohortId}/students:
 *   get:
 *     tags:
 *       - Cohorts
 *     summary: Get students in cohort
 *     description: |
 *       Returns students with their applications and task cards.
 *       Admin can access any cohort. Student can access only their active cohort.
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       email: { type: string }
 *                       profile: { type: object, nullable: true }
 *                   application:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       status: { type: string }
 *                       role:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                   tasks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         date: { type: string }
 *                         title: { type: string }
 *                         description: { type: string }
 *                         artifactLink: { type: string, nullable: true }
 *                         updatedAt: { type: string }
 *       403:
 *         description: Access denied
 *       404:
 *         description: Cohort not found
 */
router.get("/:cohortId/students", async (req, res, next) => {
  try {
    const cohortId = req.params.cohortId as string;
    const userId = req.user!.sub;
    const userRole = req.user!.role;

    // student can only access their active cohort
    if (userRole !== "ADMIN") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeCohortId: true },
      });

      if (user?.activeCohortId !== cohortId) {
        throw new AppError("FORBIDDEN", 403, "You can only view your active cohort");
      }
    }

    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new AppError("COHORT_NOT_FOUND", 404, "Cohort not found");
    }

    const applications = await prisma.application.findMany({
      where: { cohortId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        role: true,
        taskCards: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = applications.map((app) => ({
      user: app.user,
      application: {
        id: app.id,
        status: app.status,
        role: app.role ? { id: app.role.id, name: app.role.name } : null,
      },
      tasks: app.taskCards.map((task) => ({
        id: task.id,
        date: task.date,
        title: task.title,
        description: task.description,
        artifactLink: task.artifactLink,
        updatedAt: task.updatedAt,
      })),
    }));

    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
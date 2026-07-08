import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";
import { AppError } from "../../lib/errors.js";

const router = Router();

/**
 * @openapi
 * /cohorts/{cohortId}/test-tasks:
 *   get:
 *     tags:
 *       - Test Tasks
 *     summary: Get cohort test tasks
 *     description: Returns test tasks for cohort. Available for admins or students with application.
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
 *         description: Test tasks list
 *       403:
 *         description: Access denied
 */
router.get("/:cohortId/test-tasks", async (req, res, next) => {
  try {
    const cohortId = req.params.cohortId as string;
    const userId = req.user!.sub;

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
      const application = await prisma.application.findUnique({
        where: {
          userId_cohortId: {
            userId,
            cohortId,
          },
        },
      });

      if (!application) {
        throw new AppError(
          "ACCESS_DENIED",
          403,
          "You need an application for this cohort",
        );
      }
    }

    const tasks = await prisma.testTask.findMany({
      where: {
        cohortId,
      },
      orderBy: {
        publishedAt: "asc",
      },
    });

    res.json(tasks);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{cohortId}/test-tasks:
 *   post:
 *     tags:
 *       - Test Tasks
 *     summary: Create test task
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - content
 *             properties:
 *               roleId:
 *                 type: string
 *               content:
 *                 type: string
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Test task created
 *       404:
 *         description: Cohort or role not found
 */
router.post("/:cohortId/test-tasks", requireAdmin, async (req, res, next) => {
  try {
    const cohortId = req.params.cohortId as string;
    const { roleId, content, publishedAt } = req.body;

    const cohort = await prisma.cohort.findUnique({
      where: {
        id: cohortId,
      },
    });

    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }

    const role = await prisma.cohortRole.findFirst({
      where: {
        id: roleId,
        cohortId,
      },
    });

    if (!role) {
      throw new AppError(
        "ROLE_NOT_FOUND",
        404,
        "Role not found in this cohort",
      );
    }

    if (!content) {
      throw new AppError(
        "INVALID_DATA",
        400,
        "Content is required",
      );
    }

    const task = await prisma.testTask.create({
      data: {
        cohortId,
        roleId,
        content,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /cohorts/{cohortId}/test-tasks/{id}:
 *   patch:
 *     tags:
 *       - Test Tasks
 *     summary: Update test task
 *     description: Updates test task content, role or publication date.
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
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
 *               content:
 *                 type: string
 *               roleId:
 *                 type: string
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test task updated successfully
 *       404:
 *         description: Test task or role not found
 */
router.patch(
  "/:cohortId/test-tasks/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const cohortId = req.params.cohortId as string;
      const id = req.params.id as string;

      const task = await prisma.testTask.findFirst({
        where: {
          id,
          cohortId,
        },
      });

      if (!task) {
        throw new AppError(
          "TEST_TASK_NOT_FOUND",
          404,
          "Test task not found",
        );
      }

      const { content, roleId, publishedAt } = req.body;

      if (roleId) {
        const role = await prisma.cohortRole.findFirst({
          where: {
            id: roleId,
            cohortId,
          },
        });

        if (!role) {
          throw new AppError(
            "ROLE_NOT_FOUND",
            404,
            "Role not found in this cohort",
          );
        }
      }

      const updated = await prisma.testTask.update({
        where: {
          id,
        },
        data: {
          ...(content !== undefined && { content }),
          ...(roleId !== undefined && { roleId }),
          ...(publishedAt !== undefined && {
            publishedAt: new Date(publishedAt),
          }),
        },
      });

      res.json(updated);
    } catch (e) {
      next(e);
    }
  },
);

/**
 * @openapi
 * /cohorts/{cohortId}/test-tasks/{id}:
 *   delete:
 *     tags:
 *       - Test Tasks
 *     summary: Delete test task
 *     description: Deletes test task from cohort.
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Test task deleted successfully
 *       404:
 *         description: Test task not found
 */
router.delete(
  "/:cohortId/test-tasks/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const cohortId = req.params.cohortId as string;
      const id = req.params.id as string;

      const task = await prisma.testTask.findFirst({
        where: {
          id,
          cohortId,
        },
      });

      if (!task) {
        throw new AppError(
          "TEST_TASK_NOT_FOUND",
          404,
          "Test task not found",
        );
      }

      await prisma.testTask.delete({
        where: {
          id,
        },
      });

      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

export default router

import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { AppError } from "../../lib/errors.js";
import type { Request } from "express";

const router = Router();

router.use(authMiddleware);

async function getApplicationOrThrow(id: string) {
  const application = await prisma.application.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
      cohort: true,
    },
  });

  if (!application) {
    throw new AppError(
      "APPLICATION_NOT_FOUND",
      404,
      "Application not found",
    );
  }

  return application;
}

async function requireApplicationAccess(
  req: Request,
  applicationId: string,
) {
  const application = await getApplicationOrThrow(applicationId);

  if (
    req.user?.role !== "ADMIN" &&
    application.userId !== req.user?.sub
  ) {
    throw new AppError(
      "FORBIDDEN",
      403,
      "You do not have access to this application",
    );
  }

  return application;
}


/**
 * @openapi
 * /applications/{id}/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get cohort tasks
 *     description: Returns all tasks from the application cohort.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tasks list
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.get(
  "/:id/tasks",
  async (req, res, next) => {
    try {
      const application = await requireApplicationAccess(
        req,
        req.params.id as string,
      );

      const tasks = await prisma.taskCard.findMany({
        where: {
          application: {
            cohortId: application.cohortId,
          },
        },
        include: {
          application: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      res.json(tasks);
    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /applications/{id}/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create task
 *     description: Create task for application owner.
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - date
 *               - title
 *               - description
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               artifactLink:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Task already exists for this day
 */
router.post(
  "/:id/tasks",
  async (req, res, next) => {
    try {
      const application = await requireApplicationAccess(
        req,
        req.params.id as string,
      );

      const {
        date,
        title,
        description,
        artifactLink,
      } = req.body;

      try {
        const task = await prisma.taskCard.create({
          data: {
            applicationId: application.id,
            date: new Date(date),
            title,
            description,
            artifactLink,
          },
        });

        res.status(201).json(task);
      } catch (e: any) {
        if (
          e.code === "P2002"
        ) {
          throw new AppError(
            "TASK_ALREADY_EXISTS",
            409,
            "Task already exists for this date",
          );
        }

        throw e;
      }
    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /applications/{id}/tasks/{taskId}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update task
 *     description: Update own task or any task as admin.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *     responses:
 *       200:
 *         description: Task updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.patch(
  "/:id/tasks/:taskId",
  async (req, res, next) => {
    try {
      const application = await getApplicationOrThrow(
        req.params.id as string,
      );

      const task = await prisma.taskCard.findFirst({
        where: {
          id: req.params.taskId as string,
          applicationId: application.id,
        },
      });

      if (!task) {
        throw new AppError(
          "TASK_NOT_FOUND",
          404,
          "Task not found",
        );
      }

      const userId = req.user?.sub;

      if (
        req.user?.role !== "ADMIN" &&
        application.userId !== userId
      ) {
        throw new AppError(
          "FORBIDDEN",
          403,
          "You cannot edit this task",
        );
      }

      const updated = await prisma.taskCard.update({
        where: {
          id: task.id,
        },
        data: {
          title: req.body.title,
          description: req.body.description,
          artifactLink: req.body.artifactLink,
          date: req.body.date,
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
  * /applications/{id}/tasks/{taskId}:
  *   delete:
  *     tags:
  *       - Tasks
  *     summary: Delete task
  *     description: Deletes task. Only ADMIN users can delete tasks.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: string
  *       - in: path
  *         name: taskId
  *         required: true
  *         schema:
  *           type: string
  *     security:
  *       - bearerAuth: []
  *     responses:
  *       204:
  *         description: Task deleted successfully
  *       403:
  *         description: Forbidden
  *       404:
  *         description: Task or application not found
  */
router.delete(
  "/:id/tasks/:taskId",
  async (req, res, next) => {
    try {
      if (req.user?.role !== "ADMIN") {
        throw new AppError(
          "FORBIDDEN",
          403,
          "Only admins can delete tasks",
        );
      }

      const application = await getApplicationOrThrow(
        req.params.id as string,
      );

      const task = await prisma.taskCard.findFirst({
        where: {
          id: req.params.taskId as string,
          applicationId: application.id,
        },
      });

      if (!task) {
        throw new AppError(
          "TASK_NOT_FOUND",
          404,
          "Task not found",
        );
      }

      await prisma.taskCard.delete({
        where: {
          id: task.id,
        },
      });

      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);


export default router;

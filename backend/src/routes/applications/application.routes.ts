import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";

import tasksRouter from "./tasks.routes.js"
import filesRouter from "./files.routes.js"
import documentsRouter from "./documents.router.js"

const router = Router();

router.use(tasksRouter)
router.use(filesRouter)
router.use(documentsRouter)


/**
 * @openapi
 * /applications:
 *   post:
 *     tags:
 *       - Applications
 *     summary: Create application
 *     description: Creates application for a cohort. One application per user per cohort.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cohortId
 *             properties:
 *               cohortId:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application created
 *       400:
 *         description: Application already exists
 *       404:
 *         description: Cohort not found
 */
router.post("/", async (req, res, next) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError("UNAUTHORIZED", 401, "Unauthorized");
    }

    const { cohortId, roleId } = req.body;

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

    const existing = await prisma.application.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId,
        },
      },
    });

    if (existing) {
      throw new AppError(
        "APPLICATION_EXISTS",
        400,
        "Application already exists",
      );
    }

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
          "Role not found",
        );
      }
    }

    const application = await prisma.application.create({
      data: {
        userId,
        cohortId,
        roleId,
      },
    });

    res.status(201).json(application);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /applications:
 *   get:
 *     tags:
 *       - Applications
 *     summary: Get applications
 *     description: Students see own applications. Admin sees applications from active cohort.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Applications list
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError("UNAUTHORIZED", 401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
        activeCohortId: true,
      },
    });

    if (!user) {
      throw new AppError(
        "USER_NOT_FOUND",
        404,
        "User not found",
      );
    }

    let where;

    if (user.role === "ADMIN") {
      if (!user.activeCohortId) {
        throw new AppError(
          "ACTIVE_COHORT_NOT_SET",
          400,
          "Admin active cohort is not set",
        );
      }

      where = {
        cohortId: user.activeCohortId,
      };
    } else {
      where = {
        userId,
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        cohort: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(applications);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /applications/{id}:
 *   get:
 *     tags:
 *       - Applications
 *     summary: Get application details
 *     description: Returns application details. Accessible by owner or admin.
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
 *         description: Application details
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const applicationId = req.params.id as string;

    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        cohort: true,
        role: true,
        answers: {
          include: {
            field: true,
          },
        },
        files: true,
        docData: true,
        taskCards: true,
      },
    });

    if (!application) {
      throw new AppError(
        "APPLICATION_NOT_FOUND",
        404,
        "Application not found",
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

    if (
      user.role !== "ADMIN" &&
      application.userId !== userId
    ) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "You cannot access this application",
      );
    }

    res.json(application);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /applications/{id}/review:
 *   patch:
 *     tags:
 *       - Applications
 *     summary: Review application
 *     description: Approves or rejects application. Reject requires reviewComment.
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - APPROVED
 *                   - REJECTED
 *               reviewComment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application reviewed
 *       400:
 *         description: Invalid review data
 *       404:
 *         description: Application not found
 */
router.patch("/:id/review", requireAdmin, async (req, res, next) => {
  try {
    const applicationId = req.params.id as string;

    const {
      status,
      reviewComment,
      roleId,
    } = req.body as {
      status?: "APPROVED" | "REJECTED";
      reviewComment?: string;
      roleId?: string;
    };

    if (
      status !== "APPROVED" &&
      status !== "REJECTED"
    ) {
      throw new AppError(
        "INVALID_STATUS",
        400,
        "Status must be APPROVED or REJECTED",
      );
    }

    if (
      status === "REJECTED" &&
      !reviewComment
    ) {
      throw new AppError(
        "COMMENT_REQUIRED",
        400,
        "Review comment is required for rejection",
      );
    }

    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new AppError(
        "APPLICATION_NOT_FOUND",
        404,
        "Application not found",
      );
    }

    // ponytail: allow rejection from any status, approval only from TEST_SUBMITTED
    if (status === "APPROVED" && application.status !== "TEST_SUBMITTED") {
      throw new AppError(
        "INVALID_STATUS",
        400,
        "Application must be in TEST_SUBMITTED status for approval",
      );
    }

    // ponytail: roleId already set at assign-test step, optional override here
    const finalRoleId = roleId ?? application.roleId;

    if (status === "APPROVED" && !finalRoleId) {
      throw new AppError(
        "ROLE_REQUIRED",
        400,
        "Role is required for approval — assign a test first",
      );
    }

    if (roleId) {
      const role = await prisma.cohortRole.findFirst({
        where: {
          id: roleId,
          cohortId: application.cohortId,
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

    const updated = await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        status,
        reviewComment: reviewComment ?? null,
        ...(roleId !== undefined && { roleId }),
      },
    });

    // ponytail: auto-set student's activeCohortId on approval
    if (status === "APPROVED") {
      await prisma.user.update({
        where: { id: application.userId },
        data: { activeCohortId: application.cohortId },
      });
    }

    res.json(updated);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /applications/{id}/answers:
 *   put:
 *     tags:
 *       - Applications
 *     summary: Save application answers
 *     description: Replaces application survey answers.
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
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - fieldId
 *                     - value
 *                   properties:
 *                     fieldId:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Answers saved
 *       403:
 *         description: Not application owner
 *       404:
 *         description: Application not found
 */
router.put("/:id/answers", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const applicationId = req.params.id as string;

    const {
      answers,
    } = req.body as {
      answers?: {
        fieldId: string;
        value: string;
      }[];
    };

    if (!Array.isArray(answers)) {
      throw new AppError(
        "INVALID_ANSWERS",
        400,
        "Answers must be an array",
      );
    }

    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new AppError(
        "APPLICATION_NOT_FOUND",
        404,
        "Application not found",
      );
    }

    if (application.userId !== userId) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "You cannot edit this application",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.applicationAnswer.deleteMany({
        where: {
          applicationId,
        },
      });

      await tx.applicationAnswer.createMany({
        data: answers.map((answer) => ({
          applicationId,
          fieldId: answer.fieldId,
          value: answer.value,
        })),
      });
    });

    const updated = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        answers: {
          include: {
            field: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /applications/{id}/test-answer:
 *   put:
 *     tags:
 *       - Applications
 *     summary: Submit test answer
 *     description: Submits test task answer for the application.
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
 *             properties:
 *               testAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test answer saved
 *       403:
 *         description: Not application owner
 *       404:
 *         description: Application not found
 */
router.put("/:id/test-answer", async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const applicationId = req.params.id as string;
    const { testAnswer } = req.body as { testAnswer?: unknown };

    if (typeof testAnswer !== "string") {
      throw new AppError("FIELD_REQUIRED", 400, "testAnswer field is required")
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found");
    }

    if (application.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "You cannot edit this application");
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { testAnswer, status: "TEST_SUBMITTED" },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /applications/{id}/assign-test:
 *   post:
 *     tags:
 *       - Applications
 *     summary: Assign test task (admin)
 *     description: Assigns a role and sets status to TEST_ASSIGNED. Admin only.
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
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test assigned
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Application not found
 */
router.post("/:id/assign-test", requireAdmin, async (req, res, next) => {
  try {
    const applicationId = req.params.id as string;
    const { roleId } = req.body as { roleId?: string };

    if (!roleId) {
      throw new AppError("ROLE_REQUIRED", 400, "Role is required");
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found");
    }

    if (application.status !== "PENDING") {
      throw new AppError("INVALID_STATUS", 400, "Application must be in PENDING status");
    }

    const role = await prisma.cohortRole.findFirst({
      where: { id: roleId, cohortId: application.cohortId },
    });

    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", 404, "Role not found in this cohort");
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { roleId, status: "TEST_ASSIGNED" },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router

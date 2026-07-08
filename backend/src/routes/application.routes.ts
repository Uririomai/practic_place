import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

const router = Router();

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

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


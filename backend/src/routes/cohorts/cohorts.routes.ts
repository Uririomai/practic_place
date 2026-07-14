import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";

import { authMiddleware, requireAdmin } from "../../middleware/auth.middleware.js";
import roleRouter from "./roles.routes.js"
import fieldsRouter from "./fields.routes.js"
import testTaskRouter from "./test-tasks.routes.js"
import documentTemplatesRouter from "./document-templates.router.js"
import studentsRouter from "./students.routes.js"

const router = Router();

router.use(authMiddleware);
router.use(roleRouter)
router.use(fieldsRouter)
router.use(testTaskRouter)
router.use(documentTemplatesRouter)
router.use(studentsRouter)

/**
 * @openapi
 * /cohorts:
 *   get:
 *     tags:
 *       - Cohorts
 *     summary: Get all cohorts
 *     description: Returns all cohorts. Available only for administrators.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cohort list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cohort'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const cohorts = await prisma.cohort.findMany({
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

    res.json(cohorts);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /active:
 *   get:
 *     summary: Get all active cohorts
 *     description: Return all active cohorts
 *     tags:
 *       - Cohorts
 *     responses:
 *       200:
 *         description: Cohort list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   applicationStart:
 *                     type: string
 *                     format: date-time
 *                   applicationEnd:
 *                     type: string
 *                     format: date-time
 */
router.get("/active", async (_req, res, next) => {
  try {
    const now = new Date()
    const cohorts = await prisma.cohort.findMany({
      where: {
        applicationStart: { lte: now },
        applicationEnd: { gte: now },
      }
    });

    res.json(cohorts);
  } catch (e) {
    next(e)
  };
});


/**
 * @openapi
 * /cohorts:
 *   post:
 *     tags:
 *       - Cohorts
 *     summary: Create cohort
 *     description: Creates a new practice cohort.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CohortInput'
 *     responses:
 *       201:
 *         description: Cohort created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cohort'
 *       400:
 *         description: Invalid input
 */
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      applicationStart,
      applicationEnd,
      practiceStart,
      practiceEnd,
    } = req.body;


    if (typeof name !== "string" || name.length === 0) {
      throw new AppError(
        "COHORT_NAME_REQUIRED",
        400,
        "Cohort name is required",
      );
    }


    const cohort = await prisma.cohort.create({
      data: {
        name,
        applicationStart: new Date(applicationStart),
        applicationEnd: new Date(applicationEnd),
        practiceStart: new Date(practiceStart),
        practiceEnd: new Date(practiceEnd),
      },
    });


    res.status(201).json(cohort);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{id}:
 *   get:
 *     tags:
 *       - Cohorts
 *     summary: Get cohort by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: idшотландии
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cohort
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cohort'
 *       404:
 *         description: Cohort not found
 */
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: {
        id: req.params.id as string,
      },
    });


    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }


    res.json(cohort);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{id}:
 *   patch:
 *     tags:
 *       - Cohorts
 *     summary: Update cohort
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CohortInput'
 *     responses:
 *       200:
 *         description: Updated cohort
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cohort'
 *       404:
 *         description: Cohort not found
 */
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;


    const exists = await prisma.cohort.findUnique({
      where: {
        id,
      },
    });


    if (!exists) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }


    const {
      name,
      applicationStart,
      applicationEnd,
      practiceStart,
      practiceEnd,
    } = req.body;


    const data: Record<string, unknown> = {};


    if (name !== undefined)
      data.name = name;

    if (applicationStart !== undefined)
      data.applicationStart = new Date(applicationStart);

    if (applicationEnd !== undefined)
      data.applicationEnd = new Date(applicationEnd);

    if (practiceStart !== undefined)
      data.practiceStart = new Date(practiceStart);

    if (practiceEnd !== undefined)
      data.practiceEnd = new Date(practiceEnd);


    const cohort = await prisma.cohort.update({
      where: {
        id,
      },
      data,
    });


    res.json(cohort);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{id}:
 *   delete:
 *     tags:
 *       - Cohorts
 *     summary: Delete cohort
 *     description: Cannot delete cohort with existing applications.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Cohort deleted
 *       404:
 *         description: Cohort not found
 */
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }

    await prisma.cohort.delete({
      where: {
        id,
      },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router

import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";
import { AppError } from "../../lib/errors.js";

const router = Router();

/**
 * @openapi
 * /cohorts/{cohortId}/roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get cohort roles
 *     description: Returns all roles configured for a cohort.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: cohortId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CohortRole'
 *       404:
 *         description: Cohort not found
 */
router.get("/:cohortId/roles", requireAdmin, async (req, res, next) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: {
        id: req.params.cohortId as string,
      },
    });


    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }


    const roles = await prisma.cohortRole.findMany({
      where: {
        cohortId: req.params.cohortId as string,
      },
      orderBy: {
        name: "asc",
      },
    });


    res.json(roles);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{cohortId}/roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: Create cohort role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: cohortId
 *         in: path
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CohortRole'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Cohort not found
 */
router.post("/:cohortId/roles", requireAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;


    if (typeof name !== "string" || name.length === 0) {
      throw new AppError(
        "ROLE_NAME_REQUIRED",
        400,
        "Role name is required",
      );
    }


    const cohort = await prisma.cohort.findUnique({
      where: {
        id: req.params.cohortId as string,
      },
    });


    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }


    const role = await prisma.cohortRole.create({
      data: {
        cohortId: req.params.cohortId as string,
        name,
      },
    });


    res.status(201).json(role);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{cohortId}/roles/{id}:
 *   patch:
 *     tags:
 *       - Roles
 *     summary: Update cohort role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: cohortId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
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
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CohortRole'
 *       404:
 *         description: Role not found
 */
router.patch("/:cohortId/roles/:id", requireAdmin, async (req, res, next) => {
  try {
    const role = await prisma.cohortRole.findFirst({
      where: {
        id: req.params.id as string,
        cohortId: req.params.cohortId as string,
      },
    });


    if (!role) {
      throw new AppError(
        "ROLE_NOT_FOUND",
        404,
        "Role not found",
      );
    }


    const { name } = req.body;


    if (typeof name !== "string" || name.length === 0) {
      throw new AppError(
        "ROLE_NAME_REQUIRED",
        400,
        "Role name is required",
      );
    }


    const updated = await prisma.cohortRole.update({
      where: {
        id: role.id,
      },
      data: {
        name,
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
 * /cohorts/{cohortId}/roles/{id}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: Delete cohort role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: cohortId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Role deleted
 *       404:
 *         description: Role not found
 */
router.delete("/:cohortId/roles/:id", requireAdmin, async (req, res, next) => {
  try {
    const role = await prisma.cohortRole.findFirst({
      where: {
        id: req.params.id as string,
        cohortId: req.params.cohortId as string,
      },
    });


    if (!role) {
      throw new AppError(
        "ROLE_NOT_FOUND",
        404,
        "Role not found",
      );
    }


    await prisma.cohortRole.delete({
      where: {
        id: role.id,
      },
    });


    res.status(204).end();
  } catch (e) {
    next(e);
  }
},
);

export default router

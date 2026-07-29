import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";
import { AppError } from "../../lib/errors.js";
import { Prisma, type $Enums } from "@prisma/client";

const router = Router();


/**
 * @openapi
 * /cohorts/{cohortId}/fields:
 *   get:
 *     tags:
 *       - Survey Fields
 *     summary: Get survey fields
 *     description: Returns public survey structure for cohort.
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
 *         description: Survey field list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SurveyField'
 *       404:
 *         description: Cohort not found
 */
router.get("/:cohortId/fields", async (req, res, next) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: {
        id: req.params.cohortId,
      },
    });


    if (!cohort) {
      throw new AppError(
        "COHORT_NOT_FOUND",
        404,
        "Cohort not found",
      );
    }


    const fields = await prisma.surveyField.findMany({
      where: {
        cohortId: req.params.cohortId,
      },
      orderBy: {
        order: "asc",
      },
    });


    res.json(fields);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{cohortId}/fields:
 *   post:
 *     tags:
 *       - Survey Fields
 *     summary: Create survey field
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
 *               - label
 *               - type
 *             properties:
 *               label:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum:
 *                   - TEXT
 *                   - TEXTAREA
 *                   - SELECT
 *               options:
 *                 type: object
 *                 nullable: true
 *               order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Field created
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Cohort not found
 */
router.post("/:cohortId/fields", requireAdmin, async (req, res, next) => {
  try {
    const {
      label,
      options,
      order,
      required,
      placeholder,
    } = req.body;
    const type = req.body.type as $Enums.SurveyFieldType;


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


    if (typeof label !== "string" || label.length === 0) {
      throw new AppError(
        "FIELD_LABEL_REQUIRED",
        400,
        "Field label is required",
      );
    }


    if (typeof type !== "string" || type.length === 0) {
      throw new AppError(
        "FIELD_TYPE_REQUIRED",
        400,
        "Field type is required",
      );
    }


    const field = await prisma.surveyField.create({
      data: {
        cohortId: req.params.cohortId as string,
        label,
        type: (type as string).toUpperCase() as $Enums.SurveyFieldType,
        options: options ?? null,
        order: typeof order === "number" ? order : 0,
        required: required ?? false,
        placeholder: placeholder ?? "",
      },
    });


    res.status(201).json(field);
  } catch (e) {
    next(e);
  }
});


/**
 * @openapi
 * /cohorts/{cohortId}/fields/order:
 *   put:
 *     tags:
 *       - Survey Fields
 *     summary: Reorder survey fields
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
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - order
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Fields reordered
 *       400:
 *         description: Invalid input
 */
router.put("/:cohortId/fields/order", requireAdmin, async (req, res, next) => {
  try {
    const { items } = req.body;


    if (!Array.isArray(items)) {
      throw new AppError(
        "FIELDS_ORDER_REQUIRED",
        400,
        "Items array is required",
      );
    }


    const ids = items.map(
      (item: { id: string }) => item.id,
    );


    const fields = await prisma.surveyField.findMany({
      where: {
        id: {
          in: ids,
        },
        cohortId: req.params.cohortId as string,
      },
    });


    if (fields.length !== ids.length) {
      throw new AppError(
        "INVALID_FIELD_LIST",
        400,
        "Some fields do not belong to cohort",
      );
    }


    await prisma.$transaction(
      items.map(
        (item: { id: string; order: number }) =>
          prisma.surveyField.update({
            where: {
              id: item.id,
            },
            data: {
              order: item.order,
            },
          }),
      ),
    );


    res.json({
      ok: true,
    });
  } catch (e) {
    next(e);
  }
},
);


/**
 * @openapi
 * /cohorts/{cohortId}/fields/{id}:
 *   patch:
 *     tags:
 *       - Survey Fields
 *     summary: Update survey field
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               type: { type: string }
 *               options: { type: array, items: { type: string } }
 *               order: { type: integer }
 *     responses:
 *       200:
 *         description: Field updated successfully
 *       404:
 *         description: Survey field not found
 */
router.patch("/:cohortId/fields/:id", requireAdmin, async (req, res, next) => {
  try {
    const field = await prisma.surveyField.findFirst({
      where: {
        id: req.params.id as string,
        cohortId: req.params.cohortId as string,
      },
    });


    if (!field) {
      throw new AppError(
        "FIELD_NOT_FOUND",
        404,
        "Survey field not found",
      );
    }


    const {
      label,
      type,
      options,
      order,
      required,
      placeholder,
    } = req.body;


    const data: Record<string, unknown> = {};


    if (label !== undefined)
      data.label = label;

    if (type !== undefined)
      data.type = (type as string).toUpperCase();

    if (options !== undefined)
      data.options = options;

    if (order !== undefined)
      data.order = order;

    if (required !== undefined)
      data.required = required;

    if (placeholder !== undefined)
      data.placeholder = placeholder;


    const updated = await prisma.surveyField.update({
      where: {
        id: field.id,
      },
      data,
    });


    res.json(updated);
  } catch (e) {
    next(e);
  }
},
);


/**
 * @openapi
 * /cohorts/{cohortId}/fields/{id}:
 *   delete:
 *     tags:
 *       - Survey Fields
 *     summary: Delete survey field
 *     description: Deletes field and related answers.
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Field deleted successfully
 *       404:
 *         description: Survey field not found
 */
router.delete("/:cohortId/fields/:id", requireAdmin, async (req, res, next) => {
  try {
    const field = await prisma.surveyField.findFirst({
      where: {
        id: req.params.id as string,
        cohortId: req.params.cohortId as string,
      },
    });


    if (!field) {
      throw new AppError(
        "FIELD_NOT_FOUND",
        404,
        "Survey field not found",
      );
    }


    await prisma.surveyField.delete({
      where: {
        id: field.id,
      },
    });


    res.status(204).end();
  } catch (e) {
    next(e);
  }
},
);

/**
 * @openapi
 * /cohorts/{cohortId}/fields/{id}:
 *   get:
 *     tags:
 *       - Survey Fields
 *     summary: Get single survey field
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Survey field
 *       404:
 *         description: Field not found
 */
router.get("/:cohortId/fields/:id", async (req, res, next) => {
  try {
    const field = await prisma.surveyField.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!field) {
      throw new AppError("FIELD_NOT_FOUND", 404, "Survey field not found");
    }

    res.json(field);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /cohorts/{cohortId}/fields/bulk:
 *   post:
 *     tags:
 *       - Survey Fields
 *     summary: Bulk create survey fields
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fields
 *             properties:
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - label
 *                     - type
 *                   properties:
 *                     label: { type: string }
 *                     type: { type: string }
 *                     options: { type: object, nullable: true }
 *                     order: { type: integer }
 *     responses:
 *       201:
 *         description: Fields created
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Cohort not found
 */
router.post("/:cohortId/fields/bulk", requireAdmin, async (req, res, next) => {
  try {
    const { fields } = req.body;

    if (!Array.isArray(fields) || fields.length === 0) {
      throw new AppError("FIELDS_REQUIRED", 400, "Non-empty fields array is required");
    }

    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.cohortId as string },
    });

    if (!cohort) {
      throw new AppError("COHORT_NOT_FOUND", 404, "Cohort not found");
    }

    const created = await prisma.$transaction(
      fields.map((f: { label: string; type: $Enums.SurveyFieldType; options?: unknown; order?: number; required?: boolean; placeholder?: string }) =>
        prisma.surveyField.create({
          data: {
            cohortId: req.params.cohortId as string,
            label: f.label,
            type: f.type,
            options: f.options ?? Prisma.DbNull,
            order: typeof f.order === "number" ? f.order : 0,
            required: f.required ?? false,
            placeholder: f.placeholder ?? "",
          },
        }),
      ),
    );

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /cohorts/{cohortId}/fields:
 *   delete:
 *     tags:
 *       - Survey Fields
 *     summary: Delete all survey fields for cohort
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: All fields deleted
 *       404:
 *         description: Cohort not found
 */
router.delete("/:cohortId/fields", requireAdmin, async (req, res, next) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.cohortId as string },
    });

    if (!cohort) {
      throw new AppError("COHORT_NOT_FOUND", 404, "Cohort not found");
    }

    await prisma.surveyField.deleteMany({
      where: { cohortId: req.params.cohortId as string },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;

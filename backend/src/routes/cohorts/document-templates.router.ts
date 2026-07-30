import { Router } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { storage } from "../../lib/storage/index.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";
import { AppError } from "../../lib/errors.js";
import { randomUUID } from "node:crypto";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
});


/**
 * @openapi
 * /cohorts/{cohortId}/document-templates:
 *   get:
 *     tags:
 *       - Document Templates
 *     summary: Get cohort document templates
 *     description: Returns all document templates for a cohort.
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
 *         description: List of templates
 *       404:
 *         description: Cohort not found
 */
router.get(
  "/:cohortId/document-templates",
  requireAdmin,
  async (req, res, next) => {
    try {
      const templates =
        await prisma.documentTemplate.findMany({
          where: {
            cohortId: req.params.cohortId as string,
          },
        });

      res.json(templates);
    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /cohorts/{cohortId}/document-templates:
 *   post:
 *     tags:
 *       - Document Templates
 *     summary: Upload document template
 *     description: Uploads a template file for cohort documents.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - name
 *               - slug
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               engine:
 *                 type: string
 *                 enum: [DOCX, TYPST]
 *                 default: DOCX
 *                 description: "Template engine: DOCX (docxtemplater) or TYPST (typst .zip)"
 *               requirements:
 *                 type: object
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Template created
 */
router.post(
  "/:cohortId/document-templates",
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const {
        name,
        slug,
        requirements = {},
        engine = "DOCX",
      } = req.body;


      if (!req.file) {
        throw new AppError(
          "FILE_REQUIRED",
          400,
          "Template file required",
        );
      }


      const cohort =
        await prisma.cohort.findUnique({
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

      const id = randomUUID()
      const ext = engine === "TYPST" ? "zip" : "docx";

      const uri =
        await storage.save(
          `cohorts/${cohort.id}/templates/${id}.${ext}`,
          req.file.buffer,
        );

      const template =
        await prisma.documentTemplate.create({
          data: {
            cohortId: cohort.id,
            name,
            slug,
            uri,
            requirements:
              typeof requirements === "string"
                ? JSON.parse(requirements)
                : requirements,
          },
        });

      const updated =
        await prisma.documentTemplate.update({
          where: {
            id: template.id,
          },
          data: {
            uri,
          },
        });


      res.status(201).json(updated);
    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /cohorts/{cohortId}/document-templates/{id}:
 *   patch:
 *     tags:
 *       - Document Templates
 *     summary: Update document template
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               requirements: { type: string, description: "JSON string" }
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Template updated
 *       404:
 *         description: Template not found
 */
router.patch(
  "/:cohortId/document-templates/:id",
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const template =
        await prisma.documentTemplate.findFirst({
          where: {
            id: req.params.id as string,
            cohortId: req.params.cohortId as string,
          },
        });


      if (!template) {
        throw new AppError(
          "TEMPLATE_NOT_FOUND",
          404,
          "Document template not found",
        );
      }


      let uri = template.uri;

      if (req.file) {
        await storage.delete(uri).catch(() => {});
        const id = randomUUID()
        // ponytail: engine from body or detect from existing uri -> file extension
        const engine = req.body.engine ?? (template.uri.endsWith(".zip") ? "TYPST" : "DOCX");
        const ext = engine === "TYPST" ? "zip" : "docx";
        uri =
          await storage.save(
            `cohorts/${template.cohortId}/templates/${id}.${ext}`,
            req.file.buffer,
          );
      }


      const updated =
        await prisma.documentTemplate.update({
          where: {
            id: template.id,
          },
          data: {
            name:
              req.body.name ??
              template.name,

            slug:
              req.body.slug ??
              template.slug,

            uri,

            requirements:
              req.body.requirements
                ? JSON.parse(req.body.requirements)
                : template.requirements,
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
 * /cohorts/{cohortId}/document-templates/{id}:
 *   delete:
 *     tags:
 *       - Document Templates
 *     summary: Delete document template
 *     parameters:
 *       - in: path
 *         name: cohortId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Template deleted
 *       404:
 *         description: Template not found
 */
router.delete(
  "/:cohortId/document-templates/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const template =
        await prisma.documentTemplate.findFirst({
          where: {
            id: req.params.id as string,
            cohortId: req.params.cohortId as string,
          },
        });


      if (!template) {
        throw new AppError(
          "TEMPLATE_NOT_FOUND",
          404,
          "Document template not found",
        );
      }


      await storage.delete(template.uri).catch(() => {});

      await prisma.documentTemplate.delete({
        where: {
          id: template.id,
        },
      });


      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);


export default router;

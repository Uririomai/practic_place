import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { storage } from "../../lib/storage/index.js";
import { checkDocumentAvailability } from "../../lib/documents/check-availability.js";
import { generateDocument } from "../../lib/documents/generator.js";

const router = Router();

router.use(authMiddleware);


/**
 * @openapi
 * /applications/{id}/documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get available application documents
 *     description: Returns cohort document templates with availability status.
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
 *         description: Document availability list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   available:
 *                     type: boolean
 *                   reason:
 *                     type: string
 *       403:
 *         description: Access denied
 *       404:
 *         description: Application not found
 */
router.get(
  "/:id/documents",
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const isAdmin = req.user!.role === "ADMIN";


      const application =
        await prisma.application.findUnique({
          where: {
            id: req.params.id,
          },

          include: {
            cohort: {
              include: {
                documentTemplates: true,
              },
            },

            files: true,
          },
        });


      if (!application) {
        throw new AppError(
          "APPLICATION_NOT_FOUND",
          404,
          "Application not found",
        );
      }


      if (
        !isAdmin &&
        application.userId !== userId
      ) {
        throw new AppError(
          "FORBIDDEN",
          403,
          "You cannot access this application",
        );
      }


      const result =
        application.cohort.documentTemplates.map(
          (template) => {

            const requirements =
              template.requirements as {
                requiresReport?: boolean;
              };


            let available = true;
            let reason: string | undefined;


            if (
              requirements.requiresReport
            ) {
              const report =
                application.files.find(
                  (file) =>
                    file.type === "REPORT",
                );


              if (!report) {
                available = false;
                reason =
                  "Report is not uploaded";
              }
              else if (
                report.status !== "APPROVED"
              ) {
                available = false;
                reason =
                  "Report is not approved";
              }
            }


            return {
              id: template.id,
              name: template.name,
              slug: template.slug,
              available,
              reason,
            };
          },
        );


      res.json(result);

    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /applications/{id}/documents/{templateId}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Download generated document
 *     description: Returns document based on cohort template.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document file
 *       403:
 *         description: Document unavailable
 *       404:
 *         description: Template not found
 */
router.get(
  "/:id/documents/:templateId",
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const isAdmin = req.user!.role === "ADMIN";


      const application =
        await prisma.application.findUnique({
          where: {
            id: req.params.id,
          },

          include: {
            files: true,
          },
        });


      if (!application) {
        throw new AppError(
          "APPLICATION_NOT_FOUND",
          404,
          "Application not found",
        );
      }


      if (
        !isAdmin &&
        application.userId !== userId
      ) {
        throw new AppError(
          "FORBIDDEN",
          403,
          "Access denied",
        );
      }


      const template =
        await prisma.documentTemplate.findUnique({
          where: {
            id: req.params.templateId,
          },
        });


      if (!template) {
        throw new AppError(
          "TEMPLATE_NOT_FOUND",
          404,
          "Document template not found",
        );
      }


      if (
        template.cohortId !== application.cohortId
      ) {
        throw new AppError(
          "TEMPLATE_NOT_FOUND",
          404,
          "Template does not belong to application cohort",
        );
      }


      const availability =
        checkDocumentAvailability(
          application,
          template,
        );


      if (!availability.available) {
        throw new AppError(
          "DOCUMENT_UNAVAILABLE",
          403,
          availability.reason!,
        );
      }


      const docData = await prisma.documentData.findUnique({
        where: { applicationId: application.id },
      });


      const file = await generateDocument(
        template.uri,
        (docData?.data ?? {}) as Record<string, unknown>,
      );


      res
        .type("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .send(file);

    } catch (e) {
      next(e);
    }
  },
);


export default router;

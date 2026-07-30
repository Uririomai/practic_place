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
            user: {
              select: { profile: true, email: true },
            },
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

      // ponytail: merge user.profile as base, docData overrides
      const userData = (application.user.profile ?? {}) as Record<string, unknown>;
      const docDataObj = (docData?.data ?? {}) as Record<string, unknown>;
      const cohort_ = await prisma.cohort.findUnique({
        where: { id: application.cohortId },
        select: { name: true, practiceStart: true, practiceEnd: true },
      });

      const role = application.roleId
        ? await prisma.cohortRole.findUnique({ where: { id: application.roleId } })
        : null;

      const userEmail = application.user.email;

      // ponytail: cohort_name, role_name, user_email added
      const cohortFields: Record<string, string> = {
        practice_start: cohort_!.practiceStart.toLocaleDateString("ru-RU") ?? "",
        practice_end: cohort_!.practiceEnd.toLocaleDateString("ru-RU") ?? "",
        cohort_name: cohort_!.name ?? "",
        role_name: role?.name ?? "",
        user_email: userEmail ?? "",
      };

      const rawData = { ...userData, ...docDataObj, ...cohortFields };

      // ponytail: replace undefined/null with "поле_не_заполнено"
      const mergedData: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawData)) {
        if (value === undefined || value === null) {
          mergedData[key] = `${key}_не_заполнено`;
        } else {
          mergedData[key] = String(value);
        }
      }

      // ponytail: student_fio_title — Фамилия И.О. из student_fio
      const studentFio = mergedData["student_fio"];
      if (studentFio && !studentFio.endsWith("_не_заполнено")) {
        const parts = studentFio.trim().split(/\s+/);
        if (parts.length >= 2) {
          const surname = parts[0];
          const initials = parts.slice(1).map((p) => (p[0]?.toUpperCase() ?? "") + ".").join("");
          mergedData["student_fio_title"] = `${surname} ${initials}`;
        } else {
          mergedData["student_fio_title"] = studentFio;
        }
      } else {
        mergedData["student_fio_title"] = "student_fio_title_не_заполнено";
      }

      const file = await generateDocument(
        template.uri,
        mergedData,
      );


      res
        .type("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .send(file);

    } catch (e) {
      next(e);
    }
  },
);


/**
 * @openapi
 * /applications/{id}/doc-data:
 *   put:
 *     tags:
 *       - Documents
 *     summary: Save document data
 *     description: Saves JSON fields for document generation. Merges with user.profile on generation (doc-data overrides profile).
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document data saved
 *       403:
 *         description: Access denied
 *       404:
 *         description: Application not found
 */
router.put(
  "/:id/doc-data",
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const isAdmin = req.user!.role === "ADMIN";

      const application = await prisma.application.findUnique({
        where: { id: req.params.id },
      });

      if (!application) {
        throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found");
      }

      if (!isAdmin && application.userId !== userId) {
        throw new AppError("FORBIDDEN", 403, "Access denied");
      }

      const docData = await prisma.documentData.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          data: req.body,
        },
        update: {
          data: req.body,
        },
      });

      res.json(docData);
    } catch (e) {
      next(e);
    }
  },
);


export default router;

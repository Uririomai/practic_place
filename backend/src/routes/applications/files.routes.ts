import { Router } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { storage } from "../../lib/storage/index.js";
import { AppError } from "../../lib/errors.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
});

router.use(authMiddleware);


/**
 * @openapi
 * /applications/{id}/files/report:
 *   put:
 *     tags:
 *       - Application Files
 *     summary: Upload report file
 *     description: Upload student practice report.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report uploaded
 *       403:
 *         description: Not application owner
 *       404:
 *         description: Application not found
 */
router.put(
  "/:id/files/report",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;

      if (!req.file) {
        throw new AppError(
          "FILE_REQUIRED",
          400,
          "Report file required",
        );
      }


      const application =
        await prisma.application.findUnique({
          where: {
            id: req.params.id as string,
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
          "You cannot upload this report",
        );
      }


      const uri =
        await storage.save(
          `applications/${application.id}/report-${Date.now()}-${req.file.originalname}`,
          req.file.buffer,
        );


      const file =
        await prisma.applicationFile.upsert({
          where: {
            applicationId_type: {
              applicationId: application.id,
              type: "REPORT",
            },
          },

          create: {
            applicationId: application.id,
            type: "REPORT",
            storageUri: uri,
          },

          update: {
            storageUri: uri,
            status: "PENDING",
            comment: null,
            reviewedAt: null,
          },
        });


      res.json(file);
    } catch (e) {
      next(e);
    }
  },
);



/**
 * @openapi
 * /applications/{id}/files/report:
 *   get:
 *     tags:
 *       - Application Files
 *     summary: Download report
 *     description: Download approved report or access as admin.
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
 *         description: Report file
 *       403:
 *         description: Access denied
 */
router.get(
  "/:id/files/report",
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;

      const application =
        await prisma.application.findUnique({
          where: {
            id: req.params.id,
          },

          include: {
            files: {
              where: {
                type: "REPORT",
              },
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


      const isAdmin =
        req.user!.role === "ADMIN";


      const file =
        application.files[0];


      if (!file) {
        throw new AppError(
          "FILE_NOT_FOUND",
          404,
          "Report not uploaded",
        );
      }


      if (
        !isAdmin &&
        (
          application.userId !== userId ||
          file.status !== "APPROVED"
        )
      ) {
        throw new AppError(
          "FORBIDDEN",
          403,
          "Report is not available",
        );
      }


      const buffer =
        await storage.read(
          file.storageUri,
        );


      res
        .type("application/octet-stream")
        .send(buffer);

    } catch (e) {
      next(e);
    }
  },
);



/**
 * @openapi
 * /applications/{id}/files/report/status:
 *   patch:
 *     tags:
 *       - Application Files
 *     summary: Review report status
 *     description: Approve or reject uploaded report.
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - APPROVED
 *                   - REJECTED
 *               comment:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/files/report/status",
  requireAdmin,
  async (req, res, next) => {
    try {
      const {
        status,
        comment,
      } = req.body;


      if (
        status === "REJECTED" &&
        !comment
      ) {
        throw new AppError(
          "COMMENT_REQUIRED",
          400,
          "Comment required for rejection",
        );
      }


      const file =
        await prisma.applicationFile.findFirst({
          where: {
            applicationId: req.params.id as string,
            type: "REPORT",
          },
        });


      if (!file) {
        throw new AppError(
          "FILE_NOT_FOUND",
          404,
          "Report not found",
        );
      }


      const updated =
        await prisma.applicationFile.update({
          where: {
            id: file.id,
          },

          data: {
            status,
            comment,
            reviewedAt: new Date(),
          },
        });


      res.json(updated);

    } catch (e) {
      next(e);
    }
  },
);


export default router;

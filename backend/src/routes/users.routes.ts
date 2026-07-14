import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.middleware.js";
import { AppError } from "../lib/errors.js";

const router = Router();

router.use(authMiddleware);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin)
 *     description: Returns all users with their applications and roles. Admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       profile:
 *                         type: object
 *                       applications:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             cohortId:
 *                               type: string
 *                             roleId:
 *                               type: string
 *                               nullable: true
 *                             status:
 *                               type: string
 *                             testAnswer:
 *                               type: string
 *                               nullable: true
 *                             createdAt:
 *                               type: string
 *                             cohort:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                             role:
 *                               type: object
 *                               nullable: true
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 cohortId:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                 cohorts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       applicationStart:
 *                         type: string
 *                       applicationEnd:
 *                         type: string
 *                       practiceStart:
 *                         type: string
 *                       practiceEnd:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       cohortId:
 *                         type: string
 *                       name:
 *                         type: string
 */
router.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
        applications: {
          select: {
            id: true,
            cohortId: true,
            roleId: true,
            status: true,
            testAnswer: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dbCohorts = await prisma.cohort.findMany({
      select: {
        id: true,
        name: true,
        applicationStart: true,
        applicationEnd: true,
        practiceStart: true,
        practiceEnd: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const dbRoles = await prisma.cohortRole.findMany({
      select: { id: true, cohortId: true, name: true },
      orderBy: { name: "asc" },
    });

    const users = dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      profile: u.profile,
      applications: u.applications.map((a) => ({
        id: a.id,
        cohortId: a.cohortId,
        roleId: a.roleId,
        status: a.status,
        testAnswer: a.testAnswer,
        createdAt: a.createdAt,
      })),
    }));

    const cohorts = dbCohorts.map((c) => ({
      id: c.id,
      name: c.name,
      applicationStart: c.applicationStart,
      applicationEnd: c.applicationEnd,
      practiceStart: c.practiceStart,
      practiceEnd: c.practiceEnd,
      createdAt: c.createdAt,
    }));

    const roles = dbRoles.map((r) => ({
      id: r.id,
      cohortId: r.cohortId,
      name: r.name,
    }));

    res.json({ users, cohorts, roles });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        activeCohortId: true,
        profile: true,
      },
    });

    if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found");

    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user
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
 *             properties:
 *               email:
 *                 type: string
 *               profile:
 *                 type: object
 *               activeCohortId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user
 *       403:
 *         description: Can only update own profile
 *       404:
 *         description: User not found
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const userId = req.user!.sub;

    // ponytail: students update only themselves, admins update anyone
    if (userId !== targetId && req.user!.role !== "ADMIN")
      throw new AppError("FORBIDDEN", 403, "Can only update own profile");

    const { email, profile, activeCohortId } = req.body;

    const data: Record<string, unknown> = {};
    if (email !== undefined) {
      if (req.user!.role !== "ADMIN") throw new AppError("FORBIDDEN", 403, "Only admins can change email");
      data.email = email;
    }
    if (activeCohortId !== undefined) {
      if (req.user!.role !== "ADMIN") throw new AppError("FORBIDDEN", 403, "Only admins can change active cohort");
      if (activeCohortId !== null) {
        const cohort = await prisma.cohort.findUnique({ where: { id: activeCohortId } });
        if (!cohort) throw new AppError("COHORT_NOT_FOUND", 404, "Cohort not found");
      }
      data.activeCohortId = activeCohortId;
    }
    // ponytail: merge profile instead of replace — spread existing into new
    if (profile !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { id: targetId },
        select: { profile: true },
      });
      data.profile = { ...(existing?.profile as Record<string, unknown> ?? {}), ...profile };
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        activeCohortId: true,
        profile: true,
      },
    });

    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin only
 *       404:
 *         description: User not found
 */
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found");

    await prisma.user.delete({ where: { id: req.params.id as string } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/{id}/profile:
 *   get:
 *     summary: Get full user profile
 *     description: |
 *       Returns complete user information including applications,
 *       documents, practice task cards, related cohorts and roles.
 *
 *       The response is a frontend-oriented aggregate view:
 *       - user contains basic account information and profile JSON
 *       - applications contain user's participation in cohorts
 *       - documents and tasks are linked through applicationId
 *       - cohorts and roles are returned as reference lists
 *
 *     tags:
 *       - Users
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *           example: user-1
 *
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum:
 *                         - STUDENT
 *                         - ADMIN
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     profile:
 *                       type: object
 *
 *                 applications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       cohortId:
 *                         type: string
 *                       roleId:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum:
 *                           - PENDING
 *                           - APPROVED
 *                           - REJECTED
 *                       surveyData:
 *                         type: object
 *                         additionalProperties:
 *                           type: string
 *                       test:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             nullable: true
 *                           answer:
 *                             type: string
 *                             nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Document data stored in application DocumentData JSON
 *                     properties:
 *                       id:
 *                         type: string
 *                       applicationId:
 *                         type: string
 *                       cohortId:
 *                         type: string
 *                       report:
 *                         type: object
 *                         properties:
 *                           fileUrl:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             nullable: true
 *                           approved:
 *                             type: boolean
 *
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       applicationId:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       artifactLink:
 *                         type: string
 *                         nullable: true
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *
 *                 cohorts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cohort'
 *
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CohortRole'
 *
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             example:
 *               code: USER_NOT_FOUND
 *               message: User not found
 */
router.get("/:id/profile", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.params.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,

        applications: {
          include: {
            cohort: true,
            role: true,

            answers: {
              include: {
                field: true,
              },
            },

            docData: true,
            files: true,
            taskCards: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(
        "USER_NOT_FOUND",
        404,
        "User not found",
      );
    }

    const cohorts = [
      ...new Map(
        user.applications
          .map((application) => application.cohort)
          .map((cohort) => [cohort.id, cohort]),
      ).values(),
    ];

    const roles = [
      ...new Map(
        user.applications
          .flatMap((application) => application.role ? [application.role] : [])
          .map((role) => [role!.id, role]),
      ).values(),
    ];

    const profile = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        profile: user.profile,
      },

      applications: user.applications.map((application) => ({
        id: application.id,

        userId: application.userId,
        cohortId: application.cohortId,
        roleId: application.roleId,

        status: application.status,

        surveyData: application.answers.reduce<Record<string, string>>(
          (data, answer) => {
            data[answer.field.label] = answer.value;
            return data;
          },
          {},
        ),

        // пока нет модели тестов
        test: {
          status: null,
          answer: null,
        },

        createdAt: application.createdAt,
      })),

      documents: user.applications.flatMap((application) => {
        if (!application.docData) {
          return [];
        }

        const report = application.files.find(
          (file) => file.type === "REPORT",
        );

        return [
          {
            id: application.docData.id,

            applicationId: application.id,
            cohortId: application.cohortId,

            ...(application.docData.data as Record<string, unknown>),

            report: {
              fileUrl: report?.storageUri ?? null,
              status: report?.status ?? null,
              approved: report?.status === "APPROVED",
            },
          },
        ];
      }),

      tasks: user.applications.flatMap((application) =>
        application.taskCards.map((task) => ({
          id: task.id,

          applicationId: application.id,

          date: task.date,
          title: task.title,
          description: task.description,

          artifactLink: task.artifactLink,

          updatedAt: task.updatedAt,
        })),
      ),

      cohorts: cohorts.map((cohort) => ({
        id: cohort.id,
        name: cohort.name,

        applicationStart: cohort.applicationStart,
        applicationEnd: cohort.applicationEnd,

        practiceStart: cohort.practiceStart,
        practiceEnd: cohort.practiceEnd,

        createdAt: cohort.createdAt,
      })),

      roles: roles.map((role) => ({
        id: role.id,
        cohortId: role.cohortId,
        name: role.name,
      })),
    };

    res.json(profile);
  } catch (e) {
    next(e);
  }
});

export default router;

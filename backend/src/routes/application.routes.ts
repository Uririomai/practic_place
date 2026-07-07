import { Router } from "express";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    next();
  } catch (e) {
    next(e);
  }
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { cohortId, roleId } = req.body;

    if (typeof cohortId !== "string" || !cohortId)
      return res.status(400).json({ error: "cohortId required" });

    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: "cohort not found" });

    if (roleId) {
      const role = await prisma.cohortRole.findUnique({ where: { id: roleId } });
      if (!role || role.cohortId !== cohortId)
        return res.status(400).json({ error: "invalid roleId" });
    }

    const existing = await prisma.application.findUnique({
      where: { userId_cohortId: { userId, cohortId } },
    });
    if (existing) return res.status(409).json({ error: "already applied" });

    const app = await prisma.application.create({
      data: {
        userId,
        cohortId,
        roleId: roleId ?? null,
        docData: { create: {} },
      },
    });

    res.status(201).json(app);
  } catch (e) {
    next(e);
  }
});

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ error: "unauthorized" });

    if (user.role === "ADMIN") {
      if (!user.activeCohortId)
        return res.status(400).json({ error: "active cohort not set" });

      const apps = await prisma.application.findMany({
        where: { cohortId: user.activeCohortId },
        include: { user: true, role: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json(apps);
    }

    const apps = await prisma.application.findMany({
      where: { userId: user.id },
      include: { cohort: true, role: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(apps);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const app = await prisma.application.findUnique({
      where: { id },
      include: { cohort: true, role: true, user: true },
    });

    if (!app) return res.status(404).json({ error: "application not found" });

    if (user.role === "STUDENT" && app.userId !== user.id)
      return res.status(403).json({ error: "forbidden" });

    if (user.role === "ADMIN" && app.cohortId !== user.activeCohortId)
      return res.status(403).json({ error: "forbidden" });

    res.json(app);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });
    if (app.userId !== user.id) return res.status(403).json({ error: "forbidden" });
    if (app.status !== "PENDING")
      return res.status(400).json({ error: "can only edit pending application" });

    const { roleId } = req.body;
    const data: Record<string, unknown> = {};
    if (roleId !== undefined) data.roleId = roleId;

    const updated = await prisma.application.update({ where: { id }, data });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/review", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { status, reviewComment } = req.body;

    if (status !== "APPROVED" && status !== "REJECTED")
      return res.status(400).json({ error: "status must be APPROVED or REJECTED" });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });

    const updated = await prisma.application.update({
      where: { id },
      data: { status, reviewComment: reviewComment ?? null },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Application answers
// ---------------------------------------------------------------------------

router.get("/:id/answers", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app || app.userId !== userId)
      return res.status(403).json({ error: "forbidden" });

    const answers = await prisma.applicationAnswer.findMany({
      where: { applicationId: id },
      include: { field: true },
    });

    res.json(answers);
  } catch (e) {
    next(e);
  }
});

router.put("/:id/answers", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app || app.userId !== userId)
      return res.status(403).json({ error: "forbidden" });

    const { answers } = req.body;
    if (!Array.isArray(answers))
      return res.status(400).json({ error: "answers array required" });

    await prisma.$transaction([
      prisma.applicationAnswer.deleteMany({ where: { applicationId: id } }),
      ...answers.map((a: { fieldId: string; value: string }) =>
        prisma.applicationAnswer.create({
          data: { applicationId: id, fieldId: a.fieldId, value: a.value },
        }),
      ),
    ]);

    const saved = await prisma.applicationAnswer.findMany({
      where: { applicationId: id },
    });

    res.json(saved);
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Practice data (doc data)
// ---------------------------------------------------------------------------

router.get("/:id/doc-data", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app || app.userId !== userId)
      return res.status(403).json({ error: "forbidden" });

    const data = await prisma.practiceData.findUnique({
      where: { applicationId: id },
    });

    if (!data) return res.status(404).json({ error: "doc data not found" });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/doc-data", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app || app.userId !== userId)
      return res.status(403).json({ error: "forbidden" });

    const { studentFullName, groupName, docFields } = req.body;
    const data: Record<string, unknown> = {};

    if (studentFullName !== undefined) data.studentFullName = studentFullName;
    if (groupName !== undefined) data.groupName = groupName;
    if (docFields !== undefined) data.docFields = docFields;

    const updated = await prisma.practiceData.upsert({
      where: { applicationId: id },
      create: { applicationId: id, ...data },
      update: data,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

router.put("/:id/report", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app || app.userId !== userId)
      return res.status(403).json({ error: "forbidden" });

    const { reportFileUrl } = req.body;
    if (typeof reportFileUrl !== "string" || !reportFileUrl)
      return res.status(400).json({ error: "reportFileUrl required" });

    const updated = await prisma.practiceData.upsert({
      where: { applicationId: id },
      create: { applicationId: id, reportFileUrl },
      update: { reportFileUrl, isReportApproved: false },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/report/approve", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });

    const updated = await prisma.practiceData.upsert({
      where: { applicationId: id },
      create: { applicationId: id, isReportApproved: true },
      update: { isReportApproved: true },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/report/reject", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });

    const updated = await prisma.practiceData.upsert({
      where: { applicationId: id },
      create: { applicationId: id, isReportApproved: false },
      update: { isReportApproved: false },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;

// ---------------------------------------------------------------------------
// Task cards
// ---------------------------------------------------------------------------

router.get("/:id/tasks", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });

    // Check access: owner or admin in same cohort
    if (app.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== "ADMIN" || app.cohortId !== user.activeCohortId)
        return res.status(403).json({ error: "forbidden" });
    }

    const tasks = await prisma.taskCard.findMany({
      where: { applicationId: id },
      orderBy: { date: "asc" },
    });

    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/tasks", authMiddleware, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });
    if (app.cohortId !== user.activeCohortId)
      return res.status(403).json({ error: "forbidden" });

    const { date, title, description, artifactLink } = req.body;
    if (typeof date !== "string" || typeof title !== "string" || !title)
      return res.status(400).json({ error: "date and title required" });

    const task = await prisma.taskCard.create({
      data: {
        applicationId: id,
        date: new Date(date),
        title,
        description: description ?? "",
        artifactLink: artifactLink ?? null,
      },
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/tasks/:taskId", authMiddleware, async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user!.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });
    if (app.cohortId !== user.activeCohortId)
      return res.status(403).json({ error: "forbidden" });

    const task = await prisma.taskCard.findFirst({
      where: { id: taskId, applicationId: id },
    });
    if (!task) return res.status(404).json({ error: "task not found" });

    const { title, description, artifactLink } = req.body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (artifactLink !== undefined) data.artifactLink = artifactLink;

    const updated = await prisma.taskCard.update({ where: { id: taskId }, data });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/tasks/:taskId", authMiddleware, async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user!.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: "application not found" });
    if (app.cohortId !== user.activeCohortId)
      return res.status(403).json({ error: "forbidden" });

    const task = await prisma.taskCard.findFirst({
      where: { id: taskId, applicationId: id },
    });
    if (!task) return res.status(404).json({ error: "task not found" });

    await prisma.taskCard.delete({ where: { id: taskId } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
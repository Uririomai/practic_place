import { Router } from "express";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;

    if (!userId)
      return res.status(401).json({ error: "unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "ADMIN")
      return res.status(403).json({ error: "forbidden" });

    next();
  } catch (e) {
    next(e);
  }
}

router.use(requireAdmin);

// -----------------------------------------------------------------------------
// Cohorts
// -----------------------------------------------------------------------------

router.get("/", async (_req, res, next) => {
  try {
    const cohorts = await prisma.cohort.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(cohorts);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      applicationStart,
      applicationEnd,
      practiceStart,
      practiceEnd,
    } = req.body;

    if (typeof name !== "string" || !name)
      return res.status(400).json({ error: "name required" });

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

router.get("/:id", async (req, res, next) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.id },
    });

    if (!cohort)
      return res.status(404).json({ error: "Cohort not found" });

    res.json(cohort);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const {
      name,
      applicationStart,
      applicationEnd,
      practiceStart,
      practiceEnd,
    } = req.body;

    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name;
    if (applicationStart !== undefined) data.applicationStart = new Date(applicationStart);
    if (applicationEnd !== undefined) data.applicationEnd = new Date(applicationEnd);
    if (practiceStart !== undefined) data.practiceStart = new Date(practiceStart);
    if (practiceEnd !== undefined) data.practiceEnd = new Date(practiceEnd);

    const cohort = await prisma.cohort.update({
      where: { id: req.params.id },
      data,
    });

    res.json(cohort);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.cohort.delete({
      where: { id: req.params.id },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// -----------------------------------------------------------------------------
// Roles
// -----------------------------------------------------------------------------

router.get("/:cohortId/roles", async (req, res, next) => {
  try {
    const roles = await prisma.cohortRole.findMany({
      where: {
        cohortId: req.params.cohortId,
      },
    });

    res.json(roles);
  } catch (e) {
    next(e);
  }
});

router.post("/:cohortId/roles", async (req, res, next) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name)
      return res.status(400).json({ error: "name required" });

    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.cohortId },
    });

    if (!cohort)
      return res.status(404).json({ error: "Cohort not found" });

    const role = await prisma.cohortRole.create({
      data: {
        cohortId: req.params.cohortId,
        name,
      },
    });

    res.status(201).json(role);
  } catch (e) {
    next(e);
  }
});

router.patch("/:cohortId/roles/:id", async (req, res, next) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name)
      return res.status(400).json({ error: "name required" });

    const role = await prisma.cohortRole.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!role)
      return res.status(404).json({ error: "Role not found" });

    const updated = await prisma.cohortRole.update({
      where: { id: role.id },
      data: { name },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/:cohortId/roles/:id", async (req, res, next) => {
  try {
    const role = await prisma.cohortRole.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!role)
      return res.status(404).json({ error: "Role not found" });

    await prisma.cohortRole.delete({
      where: { id: role.id },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// -----------------------------------------------------------------------------
// Survey fields
// -----------------------------------------------------------------------------

router.get("/:cohortId/fields", async (req, res, next) => {
  try {
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

router.post("/:cohortId/fields", async (req, res, next) => {
  try {
    const { label, type, options, order } = req.body;

    if (typeof label !== "string" || !label)
      return res.status(400).json({ error: "label required" });

    if (typeof type !== "string" || !type)
      return res.status(400).json({ error: "type required" });

    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.cohortId },
    });

    if (!cohort)
      return res.status(404).json({ error: "Cohort not found" });

    const field = await prisma.surveyField.create({
      data: {
        cohortId: req.params.cohortId,
        label,
        type,
        options: options ?? null,
        order: typeof order === "number" ? order : 0,
      },
    });

    res.status(201).json(field);
  } catch (e) {
    next(e);
  }
});

router.put("/:cohortId/fields/order", async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array required" });
    }

    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.surveyField.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.patch("/:cohortId/fields/:id", async (req, res, next) => {
  try {
    const field = await prisma.surveyField.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }

    const { label, type, options, order } = req.body;

    const data: Record<string, unknown> = {};

    if (label !== undefined) data.label = label;
    if (type !== undefined) data.type = type;
    if (options !== undefined) data.options = options;
    if (order !== undefined) data.order = order;

    const updated = await prisma.surveyField.update({
      where: { id: field.id },
      data,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/:cohortId/fields/:id", async (req, res, next) => {
  try {
    const field = await prisma.surveyField.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!field)
      return res.status(404).json({ error: "Field not found" });

    await prisma.surveyField.delete({
      where: { id: field.id },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// -----------------------------------------------------------------------------
// Test tasks
// -----------------------------------------------------------------------------

router.get("/:cohortId/test-tasks", async (req, res, next) => {
  try {
    const tasks = await prisma.testTask.findMany({
      where: {
        cohortId: req.params.cohortId,
      },
    });

    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

router.post("/:cohortId/test-tasks", async (req, res, next) => {
  try {
    const { content, publishedAt } = req.body;

    if (typeof content !== "string" || !content) {
      return res.status(400).json({ error: "content required" });
    }

    const cohort = await prisma.cohort.findUnique({
      where: { id: req.params.cohortId },
    });

    if (!cohort)
      return res.status(404).json({ error: "Cohort not found" });

    const task = await prisma.testTask.create({
      data: {
        cohortId: req.params.cohortId,
        content,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

router.patch("/:cohortId/test-tasks/:id", async (req, res, next) => {
  try {
    const task = await prisma.testTask.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!task)
      return res.status(404).json({ error: "Task not found" });

    const { content, publishedAt } = req.body;

    const data: Record<string, unknown> = {};

    if (content !== undefined) data.content = content;
    if (publishedAt !== undefined)
      data.publishedAt = publishedAt ? new Date(publishedAt) : null;

    const updated = await prisma.testTask.update({
      where: { id: task.id },
      data,
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete("/:cohortId/test-tasks/:id", async (req, res, next) => {
  try {
    const task = await prisma.testTask.findFirst({
      where: {
        id: req.params.id,
        cohortId: req.params.cohortId,
      },
    });

    if (!task)
      return res.status(404).json({ error: "Task not found" });

    await prisma.testTask.delete({
      where: { id: task.id },
    });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;

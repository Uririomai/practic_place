import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Hoisted mutable DB state
// ---------------------------------------------------------------------------
const fakeDb = vi.hoisted(() => {
  type FakeCohort = {
    id: string;
    name: string;
    applicationStart: Date;
    applicationEnd: Date;
    practiceStart: Date;
    practiceEnd: Date;
    createdAt: Date;
  };

  type FakeRole = {
    id: string;
    cohortId: string;
    name: string;
  };

  type FakeField = {
    id: string;
    cohortId: string;
    label: string;
    type: string;
    options: unknown;
    order: number;
  };

  type FakeTask = {
    id: string;
    cohortId: string;
    content: string;
    publishedAt: Date | null;
  };

  return {
    users: [] as Array<{ id: string; role: string }>,
    cohorts: [] as FakeCohort[],
    roles: [] as FakeRole[],
    fields: [] as FakeField[],
    testTasks: [] as FakeTask[],
    idCounter: 0,
  };
});

// ---------------------------------------------------------------------------
// JWT mock — authMiddleware calls verifyToken
// ---------------------------------------------------------------------------
vi.mock("../lib/jwt.js", () => ({
  verifyToken: (token: string) => {
    if (token === "admin-token") return { sub: "admin-id", email: "admin@test.com" };
    if (token === "student-token") return { sub: "student-id", email: "student@test.com" };
    throw new Error("invalid token");
  },
  signToken: () => "mock-token",
}));

// ---------------------------------------------------------------------------
// Prisma mock — used by requireAdmin + all cohort handlers
// ---------------------------------------------------------------------------
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        fakeDb.users.find((u) => u.id === where.id) ?? null,
    },

    cohort: {
      findMany: async () => [...fakeDb.cohorts],
      findUnique: async ({ where }: { where: { id: string } }) =>
        fakeDb.cohorts.find((c) => c.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const c = {
          id: `c-${++fakeDb.idCounter}`,
          ...data,
          applicationStart: new Date(data.applicationStart as string),
          applicationEnd: new Date(data.applicationEnd as string),
          practiceStart: new Date(data.practiceStart as string),
          practiceEnd: new Date(data.practiceEnd as string),
          createdAt: new Date(),
        } as (typeof fakeDb.cohorts)[number];
        fakeDb.cohorts.unshift(c);
        return c;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = fakeDb.cohorts.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error("not found");
        fakeDb.cohorts[idx] = { ...fakeDb.cohorts[idx], ...data } as (typeof fakeDb.cohorts)[number];
        return fakeDb.cohorts[idx];
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = fakeDb.cohorts.findIndex((c) => c.id === where.id);
        if (idx === -1) throw new Error("not found");
        fakeDb.cohorts.splice(idx, 1);
      },
    },

    cohortRole: {
      findMany: async ({ where }: { where: { cohortId: string } }) =>
        fakeDb.roles.filter((r) => r.cohortId === where.cohortId),
      findFirst: async ({ where }: { where: { id: string; cohortId: string } }) =>
        fakeDb.roles.find((r) => r.id === where.id && r.cohortId === where.cohortId) ?? null,
      create: async ({ data }: { data: { cohortId: string; name: string } }) => {
        const r = { id: `r-${++fakeDb.idCounter}`, ...data };
        fakeDb.roles.push(r);
        return r;
      },
      update: async ({ where, data }: { where: { id: string }; data: { name: string } }) => {
        const r = fakeDb.roles.find((r) => r.id === where.id);
        if (!r) throw new Error("not found");
        Object.assign(r, data);
        return r;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = fakeDb.roles.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error("not found");
        fakeDb.roles.splice(idx, 1);
      },
    },

    surveyField: {
      findMany: async ({ where, orderBy }: { where: { cohortId: string }; orderBy?: { order: string } }) => {
        const filtered = fakeDb.fields.filter((f) => f.cohortId === where.cohortId);
        if (orderBy?.order === "asc") filtered.sort((a, b) => a.order - b.order);
        return filtered;
      },
      findFirst: async ({ where }: { where: { id: string; cohortId: string } }) =>
        fakeDb.fields.find((f) => f.id === where.id && f.cohortId === where.cohortId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const f = {
          id: `f-${++fakeDb.idCounter}`,
          cohortId: data.cohortId as string,
          label: data.label as string,
          type: data.type as string,
          options: data.options ?? null,
          order: (data.order as number) ?? 0,
        };
        fakeDb.fields.push(f);
        return f;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const f = fakeDb.fields.find((f) => f.id === where.id);
        if (!f) throw new Error("not found");
        Object.assign(f, data);
        return f;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = fakeDb.fields.findIndex((f) => f.id === where.id);
        if (idx === -1) throw new Error("not found");
        fakeDb.fields.splice(idx, 1);
      },
    },

    testTask: {
      findMany: async ({ where }: { where: { cohortId: string } }) =>
        fakeDb.testTasks.filter((t) => t.cohortId === where.cohortId),
      findFirst: async ({ where }: { where: { id: string; cohortId: string } }) =>
        fakeDb.testTasks.find((t) => t.id === where.id && t.cohortId === where.cohortId) ?? null,
      create: async ({ data }: { data: { cohortId: string; content: string; publishedAt: Date | null } }) => {
        const t = { id: `t-${++fakeDb.idCounter}`, ...data };
        fakeDb.testTasks.push(t);
        return t;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const t = fakeDb.testTasks.find((t) => t.id === where.id);
        if (!t) throw new Error("not found");
        Object.assign(t, data);
        return t;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = fakeDb.testTasks.findIndex((t) => t.id === where.id);
        if (idx === -1) throw new Error("not found");
        fakeDb.testTasks.splice(idx, 1);
      },
    },

    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
import { createApp } from "../app.js";

const app = createApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  fakeDb.users.length = 0;
  fakeDb.cohorts.length = 0;
  fakeDb.roles.length = 0;
  fakeDb.fields.length = 0;
  fakeDb.testTasks.length = 0;
  fakeDb.idCounter = 0;

  // Seed an admin user — requireAdmin checks this
  fakeDb.users.push({ id: "admin-id", role: "ADMIN" });
});

// ===========================================================================
// Edge cases: access denied
// ===========================================================================

describe("cohorts — auth edge cases", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/cohorts");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/cohorts")
      .set(auth("bad-token"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    // Add student user, remove admin
    fakeDb.users.length = 0;
    fakeDb.users.push({ id: "student-id", role: "STUDENT" });

    const res = await request(app)
      .get("/cohorts")
      .set(auth("student-token"));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });
});

// ===========================================================================
// Cohorts CRUD
// ===========================================================================

describe("GET /cohorts", () => {
  it("returns empty list", async () => {
    const res = await request(app).get("/cohorts").set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all cohorts ordered by createdAt desc", async () => {
    fakeDb.cohorts.push({
      id: "c-old",
      name: "Old",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date("2025-01-01"),
    });
    fakeDb.cohorts.push({
      id: "c-new",
      name: "New",
      applicationStart: new Date("2026-01-01"),
      applicationEnd: new Date("2026-02-01"),
      practiceStart: new Date("2026-03-01"),
      practiceEnd: new Date("2026-04-01"),
      createdAt: new Date("2026-01-01"),
    });

    const res = await request(app).get("/cohorts").set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // findMany returns [...fakeDb.cohorts] (order not modified)
    expect(res.body[0]!.name).toBe("Old");
  });
});

describe("POST /cohorts", () => {
  const validCohort = {
    name: "2025-Поток",
    applicationStart: "2025-09-01",
    applicationEnd: "2025-09-30",
    practiceStart: "2025-10-01",
    practiceEnd: "2025-12-31",
  };

  it("creates a cohort and returns 201", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set(auth("admin-token"))
      .send(validCohort);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("2025-Поток");
    expect(res.body.id).toBe("c-1");
    expect(fakeDb.cohorts).toHaveLength(1);
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set(auth("admin-token"))
      .send({ applicationStart: "2025-09-01" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name required");
  });

  it("returns 400 when name is empty string", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set(auth("admin-token"))
      .send({ ...validCohort, name: "" });

    expect(res.status).toBe(400);
  });
});

describe("GET /cohorts/:id", () => {
  it("returns a cohort by id", async () => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "Demo",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });

    const res = await request(app).get("/cohorts/c-1").set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Demo");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/cohorts/nope").set(auth("admin-token"));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Cohort not found");
  });
});

describe("PATCH /cohorts/:id", () => {
  it("updates cohort fields", async () => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "Old Name",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });

    const res = await request(app)
      .patch("/cohorts/c-1")
      .set(auth("admin-token"))
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });
});

describe("DELETE /cohorts/:id", () => {
  it("deletes cohort and returns 204", async () => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "To Delete",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });

    const res = await request(app).delete("/cohorts/c-1").set(auth("admin-token"));
    expect(res.status).toBe(204);
    expect(fakeDb.cohorts).toHaveLength(0);
  });
});

// ===========================================================================
// Roles
// ===========================================================================

describe("cohort roles", () => {
  beforeEach(() => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "Test Cohort",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });
  });

  it("GET /:cohortId/roles — returns empty list", async () => {
    const res = await request(app)
      .get("/cohorts/c-1/roles")
      .set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /:cohortId/roles — creates role", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/roles")
      .set(auth("admin-token"))
      .send({ name: "Developer" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Developer");
    expect(res.body.cohortId).toBe("c-1");
  });

  it("POST /:cohortId/roles — 400 when name missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/roles")
      .set(auth("admin-token"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /:cohortId/roles — 404 when cohort missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-missing/roles")
      .set(auth("admin-token"))
      .send({ name: "Dev" });
    expect(res.status).toBe(404);
  });

  it("PATCH /:cohortId/roles/:id — updates role within cohort", async () => {
    fakeDb.roles.push({ id: "r-1", cohortId: "c-1", name: "Old" });

    const res = await request(app)
      .patch("/cohorts/c-1/roles/r-1")
      .set(auth("admin-token"))
      .send({ name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated");
  });

  it("PATCH /:cohortId/roles/:id — 404 for wrong cohort", async () => {
    fakeDb.roles.push({ id: "r-1", cohortId: "c-other", name: "Old" });

    const res = await request(app)
      .patch("/cohorts/c-1/roles/r-1")
      .set(auth("admin-token"))
      .send({ name: "Updated" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:cohortId/roles/:id — deletes role within cohort", async () => {
    fakeDb.roles.push({ id: "r-1", cohortId: "c-1", name: "To Delete" });

    const res = await request(app)
      .delete("/cohorts/c-1/roles/r-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(204);
    expect(fakeDb.roles).toHaveLength(0);
  });

  it("DELETE /:cohortId/roles/:id — 404 for wrong cohort", async () => {
    fakeDb.roles.push({ id: "r-1", cohortId: "c-other", name: "To Delete" });

    const res = await request(app)
      .delete("/cohorts/c-1/roles/r-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Survey fields
// ===========================================================================

describe("survey fields", () => {
  beforeEach(() => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "Test Cohort",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });
  });

  it("GET /:cohortId/fields — returns fields ordered by order", async () => {
    fakeDb.fields.push(
      { id: "f-1", cohortId: "c-1", label: "B", type: "text", options: null, order: 2 },
      { id: "f-2", cohortId: "c-1", label: "A", type: "text", options: null, order: 1 },
    );

    const res = await request(app)
      .get("/cohorts/c-1/fields")
      .set(auth("admin-token"));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]!.label).toBe("A");
    expect(res.body[1]!.label).toBe("B");
  });

  it("POST /:cohortId/fields — creates field", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/fields")
      .set(auth("admin-token"))
      .send({ label: "Group", type: "text", order: 1 });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe("Group");
  });

  it("POST /:cohortId/fields — 400 when label missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/fields")
      .set(auth("admin-token"))
      .send({ type: "text" });
    expect(res.status).toBe(400);
  });

  it("POST /:cohortId/fields — 400 when type missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/fields")
      .set(auth("admin-token"))
      .send({ label: "X" });
    expect(res.status).toBe(400);
  });

  it("PUT /:cohortId/fields/order — reorders fields", async () => {
    fakeDb.fields.push(
      { id: "f-1", cohortId: "c-1", label: "A", type: "text", options: null, order: 1 },
      { id: "f-2", cohortId: "c-1", label: "B", type: "text", options: null, order: 2 },
    );

    const res = await request(app)
      .put("/cohorts/c-1/fields/order")
      .set(auth("admin-token"))
      .send({ items: [{ id: "f-1", order: 2 }, { id: "f-2", order: 1 }] });

    expect(res.status).toBe(200);
    expect(fakeDb.fields.find((f) => f.id === "f-1")!.order).toBe(2);
    expect(fakeDb.fields.find((f) => f.id === "f-2")!.order).toBe(1);
  });

  it("PUT /:cohortId/fields/order — 400 when items missing", async () => {
    const res = await request(app)
      .put("/cohorts/c-1/fields/order")
      .set(auth("admin-token"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /:cohortId/fields/:id — updates field within cohort", async () => {
    fakeDb.fields.push({ id: "f-1", cohortId: "c-1", label: "Old", type: "text", options: null, order: 1 });

    const res = await request(app)
      .patch("/cohorts/c-1/fields/f-1")
      .set(auth("admin-token"))
      .send({ label: "New Label" });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe("New Label");
  });

  it("PATCH /:cohortId/fields/:id — 404 for wrong cohort", async () => {
    fakeDb.fields.push({ id: "f-1", cohortId: "c-other", label: "Old", type: "text", options: null, order: 1 });

    const res = await request(app)
      .patch("/cohorts/c-1/fields/f-1")
      .set(auth("admin-token"))
      .send({ label: "X" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:cohortId/fields/:id — deletes field within cohort", async () => {
    fakeDb.fields.push({ id: "f-1", cohortId: "c-1", label: "X", type: "text", options: null, order: 1 });

    const res = await request(app)
      .delete("/cohorts/c-1/fields/f-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(204);
    expect(fakeDb.fields).toHaveLength(0);
  });

  it("DELETE /:cohortId/fields/:id — 404 for wrong cohort", async () => {
    fakeDb.fields.push({ id: "f-1", cohortId: "c-other", label: "X", type: "text", options: null, order: 1 });

    const res = await request(app)
      .delete("/cohorts/c-1/fields/f-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Test tasks
// ===========================================================================

describe("test tasks", () => {
  beforeEach(() => {
    fakeDb.cohorts.push({
      id: "c-1",
      name: "Test Cohort",
      applicationStart: new Date("2025-01-01"),
      applicationEnd: new Date("2025-02-01"),
      practiceStart: new Date("2025-03-01"),
      practiceEnd: new Date("2025-04-01"),
      createdAt: new Date(),
    });
  });

  it("GET /:cohortId/test-tasks — returns empty list", async () => {
    const res = await request(app)
      .get("/cohorts/c-1/test-tasks")
      .set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /:cohortId/test-tasks — creates task", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/test-tasks")
      .set(auth("admin-token"))
      .send({ content: "Build a REST API" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Build a REST API");
  });

  it("POST /:cohortId/test-tasks — 400 when content missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-1/test-tasks")
      .set(auth("admin-token"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /:cohortId/test-tasks — 404 when cohort missing", async () => {
    const res = await request(app)
      .post("/cohorts/c-missing/test-tasks")
      .set(auth("admin-token"))
      .send({ content: "X" });
    expect(res.status).toBe(404);
  });

  it("PATCH /:cohortId/test-tasks/:id — updates task within cohort", async () => {
    fakeDb.testTasks.push({ id: "t-1", cohortId: "c-1", content: "Old", publishedAt: null });

    const res = await request(app)
      .patch("/cohorts/c-1/test-tasks/t-1")
      .set(auth("admin-token"))
      .send({ content: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Updated");
  });

  it("PATCH /:cohortId/test-tasks/:id — 404 for wrong cohort", async () => {
    fakeDb.testTasks.push({ id: "t-1", cohortId: "c-other", content: "Old", publishedAt: null });

    const res = await request(app)
      .patch("/cohorts/c-1/test-tasks/t-1")
      .set(auth("admin-token"))
      .send({ content: "X" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:cohortId/test-tasks/:id — deletes task within cohort", async () => {
    fakeDb.testTasks.push({ id: "t-1", cohortId: "c-1", content: "X", publishedAt: null });

    const res = await request(app)
      .delete("/cohorts/c-1/test-tasks/t-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(204);
    expect(fakeDb.testTasks).toHaveLength(0);
  });

  it("DELETE /:cohortId/test-tasks/:id — 404 for wrong cohort", async () => {
    fakeDb.testTasks.push({ id: "t-1", cohortId: "c-other", content: "X", publishedAt: null });

    const res = await request(app)
      .delete("/cohorts/c-1/test-tasks/t-1")
      .set(auth("admin-token"));

    expect(res.status).toBe(404);
  });
});
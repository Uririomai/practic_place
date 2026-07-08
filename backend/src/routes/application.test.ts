import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Fake DB types
// ---------------------------------------------------------------------------
type FakeUser = {
  id: string;
  email: string;
  role: string;
  activeCohortId: string | null;
  createdAt: Date;
};

type FakeCohort = {
  id: string;
  name: string;
};

type FakeRole = {
  id: string;
  cohortId: string;
  name: string;
};

type FakeApp = {
  id: string;
  userId: string;
  cohortId: string;
  roleId: string | null;
  status: string;
  reviewComment: string | null;
  createdAt: Date;
};

type FakeAnswer = {
  id: string;
  applicationId: string;
  fieldId: string;
  value: string;
};

type FakePracticeData = {
  id: string;
  applicationId: string;
  studentFullName: string | null;
  groupName: string | null;
  docFields: Record<string, unknown>;
  reportFileUrl: string | null;
  isReportApproved: boolean;
};

// ---------------------------------------------------------------------------
// Hoisted mutable DB
// ---------------------------------------------------------------------------
const fakeDb = vi.hoisted(() => ({
  users: [] as FakeUser[],
  cohorts: [] as FakeCohort[],
  roles: [] as FakeRole[],
  apps: [] as FakeApp[],
  answers: [] as FakeAnswer[],
  practiceData: [] as FakePracticeData[],
  idCounter: 0,
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("../lib/jwt.js", () => ({
  verifyToken: (token: string) => {
    if (token === "admin-token") return { sub: "a-1", email: "admin@test.com" };
    if (token === "student-token") return { sub: "s-1", email: "s@test.com" };
    if (token === "other-token") return { sub: "s-2", email: "other@test.com" };
    throw new Error("invalid");
  },
  signToken: () => "mock-token",
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
        fakeDb.users.find((u) => u.id === where.id || u.email === where.email) ?? null,
    },

    cohort: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        fakeDb.cohorts.find((c) => c.id === where.id) ?? null,
    },

    cohortRole: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        fakeDb.roles.find((r) => r.id === where.id) ?? null,
    },

    application: {
      findMany: async ({ where }: { where: { userId?: string; cohortId?: string } }) => {
        if (where.userId) return fakeDb.apps.filter((a) => a.userId === where.userId);
        if (where.cohortId) return fakeDb.apps.filter((a) => a.cohortId === where.cohortId);
        return fakeDb.apps;
      },
      findUnique: async ({ where }: { where: { id: string; userId_cohortId?: { userId: string; cohortId: string } } }) => {
        if (where.userId_cohortId) {
          return fakeDb.apps.find(
            (a) => a.userId === where.userId_cohortId?.userId && a.cohortId === where.userId_cohortId?.cohortId,
          ) ?? null;
        }
        return fakeDb.apps.find((a) => a.id === where.id) ?? null;
      },
      create: async ({ data }: { data: { userId: string; cohortId: string; roleId: string | null } }) => {
        const app: FakeApp = {
          id: `a-${++fakeDb.idCounter}`,
          userId: data.userId,
          cohortId: data.cohortId,
          roleId: data.roleId ?? null,
          status: "PENDING",
          reviewComment: null,
          createdAt: new Date(),
        };
        fakeDb.apps.push(app);
        return app;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const a = fakeDb.apps.find((a) => a.id === where.id);
        if (!a) throw new Error("not found");
        Object.assign(a, data);
        return a;
      },
    },

    applicationAnswer: {
      findMany: async ({ where }: { where: { applicationId: string } }) =>
        fakeDb.answers.filter((a) => a.applicationId === where.applicationId),
      deleteMany: async ({ where }: { where: { applicationId: string } }) => {
        fakeDb.answers = fakeDb.answers.filter((a) => a.applicationId !== where.applicationId);
      },
      create: async ({ data }: { data: { applicationId: string; fieldId: string; value: string } }) => {
        const a: FakeAnswer = { id: `ans-${++fakeDb.idCounter}`, ...data };
        fakeDb.answers.push(a);
        return a;
      },
    },

    practiceData: {
      findUnique: async ({ where }: { where: { applicationId: string } }) =>
        fakeDb.practiceData.find((p) => p.applicationId === where.applicationId) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { applicationId: string };
        create: { applicationId: string; [k: string]: unknown };
        update: Record<string, unknown>;
      }) => {
        const existing = fakeDb.practiceData.find((p) => p.applicationId === where.applicationId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const pd: FakePracticeData = {
          id: `pd-${++fakeDb.idCounter}`,
          applicationId: create.applicationId as string,
          studentFullName: (create.studentFullName as string) ?? null,
          groupName: (create.groupName as string) ?? null,
          docFields: (create.docFields as Record<string, unknown>) ?? {},
          reportFileUrl: (create.reportFileUrl as string) ?? null,
          isReportApproved: (create.isReportApproved as boolean) ?? false,
        };
        Object.assign(pd, update);
        fakeDb.practiceData.push(pd);
        return pd;
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
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  fakeDb.users.length = 0;
  fakeDb.cohorts.length = 0;
  fakeDb.roles.length = 0;
  fakeDb.apps.length = 0;
  fakeDb.answers.length = 0;
  fakeDb.practiceData.length = 0;
  fakeDb.idCounter = 0;

  // Seed default users
  fakeDb.users.push(
    { id: "a-1", email: "admin@test.com", role: "ADMIN", activeCohortId: "c-1", createdAt: new Date() },
    { id: "s-1", email: "s@test.com", role: "STUDENT", activeCohortId: null, createdAt: new Date() },
    { id: "s-2", email: "other@test.com", role: "STUDENT", activeCohortId: null, createdAt: new Date() },
  );

  // Seed default cohort + role
  fakeDb.cohorts.push({ id: "c-1", name: "2025-Поток" });
  fakeDb.roles.push({ id: "r-1", cohortId: "c-1", name: "Developer" });
});

// ===========================================================================
// POST /applications
// ===========================================================================
describe("POST /applications", () => {
  it("creates application with cohortId only", async () => {
    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({ cohortId: "c-1" });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe("s-1");
    expect(res.body.cohortId).toBe("c-1");
    expect(res.body.status).toBe("PENDING");
    expect(fakeDb.apps).toHaveLength(1);
  });

  it("creates application with cohortId + roleId", async () => {
    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({ cohortId: "c-1", roleId: "r-1" });

    expect(res.status).toBe(201);
    expect(res.body.roleId).toBe("r-1");
  });

  it("returns 400 when cohortId missing", async () => {
    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("cohortId required");
  });

  it("returns 404 when cohort not found", async () => {
    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({ cohortId: "c-missing" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when roleId belongs to different cohort", async () => {
    fakeDb.roles.push({ id: "r-other", cohortId: "c-other", name: "Other" });

    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({ cohortId: "c-1", roleId: "r-other" });

    expect(res.status).toBe(400);
  });

  it("returns 409 when already applied", async () => {
    fakeDb.apps.push({
      id: "a-existing",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/applications")
      .set(auth("student-token"))
      .send({ cohortId: "c-1" });

    expect(res.status).toBe(409);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/applications").send({ cohortId: "c-1" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /applications
// ===========================================================================
describe("GET /applications", () => {
  it("student — returns own applications", async () => {
    fakeDb.apps.push(
      { id: "a-1", userId: "s-1", cohortId: "c-1", roleId: null, status: "PENDING", reviewComment: null, createdAt: new Date() },
      { id: "a-2", userId: "s-1", cohortId: "c-1", roleId: null, status: "APPROVED", reviewComment: null, createdAt: new Date() },
    );

    const res = await request(app).get("/applications").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("student — returns empty list", async () => {
    const res = await request(app).get("/applications").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("admin — returns applications in active cohort", async () => {
    fakeDb.apps.push(
      { id: "a-1", userId: "s-1", cohortId: "c-1", roleId: null, status: "PENDING", reviewComment: null, createdAt: new Date() },
      { id: "a-2", userId: "s-2", cohortId: "c-1", roleId: null, status: "PENDING", reviewComment: null, createdAt: new Date() },
    );

    const res = await request(app).get("/applications").set(auth("admin-token"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("admin — returns 400 when active cohort not set", async () => {
    // Admin with no active cohort
    fakeDb.users.find((u) => u.id === "a-1")!.activeCohortId = null;

    const res = await request(app).get("/applications").set(auth("admin-token"));
    expect(res.status).toBe(400);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/applications");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /applications/:id
// ===========================================================================
describe("GET /applications/:id", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("student — returns own application", async () => {
    const res = await request(app).get("/applications/a-1").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("a-1");
  });

  it("student — returns 403 for other student's application", async () => {
    const res = await request(app).get("/applications/a-1").set(auth("other-token"));
    expect(res.status).toBe(403);
  });

  it("admin — returns application in active cohort", async () => {
    const res = await request(app).get("/applications/a-1").set(auth("admin-token"));
    expect(res.status).toBe(200);
  });

  it("admin — returns 403 for application outside active cohort", async () => {
    fakeDb.apps.push({
      id: "a-outside",
      userId: "s-2",
      cohortId: "c-other",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });

    const res = await request(app).get("/applications/a-outside").set(auth("admin-token"));
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/applications/nope").set(auth("student-token"));
    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/applications/a-1");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /applications/:id
// ===========================================================================
describe("PATCH /applications/:id", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("updates roleId", async () => {
    const res = await request(app)
      .patch("/applications/a-1")
      .set(auth("student-token"))
      .send({ roleId: "r-1" });

    expect(res.status).toBe(200);
    expect(res.body.roleId).toBe("r-1");
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app)
      .patch("/applications/a-1")
      .set(auth("other-token"))
      .send({ roleId: "r-1" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when application not PENDING", async () => {
    fakeDb.apps.find((a) => a.id === "a-1")!.status = "APPROVED";

    const res = await request(app)
      .patch("/applications/a-1")
      .set(auth("student-token"))
      .send({ roleId: "r-1" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/applications/nope")
      .set(auth("student-token"))
      .send({ roleId: "r-1" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/applications/a-1").send({ roleId: "r-1" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /applications/:id/review
// ===========================================================================
describe("PATCH /applications/:id/review", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("approves application", async () => {
    const res = await request(app)
      .patch("/applications/a-1/review")
      .set(auth("admin-token"))
      .send({ status: "APPROVED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
  });

  it("rejects application with comment", async () => {
    const res = await request(app)
      .patch("/applications/a-1/review")
      .set(auth("admin-token"))
      .send({ status: "REJECTED", reviewComment: "Missing documents" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
    expect(res.body.reviewComment).toBe("Missing documents");
  });

  it("returns 400 for invalid status", async () => {
    const res = await request(app)
      .patch("/applications/a-1/review")
      .set(auth("admin-token"))
      .send({ status: "INVALID" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/applications/nope/review")
      .set(auth("admin-token"))
      .send({ status: "APPROVED" });

    expect(res.status).toBe(404);
  });

  it("returns 403 when student tries", async () => {
    const res = await request(app)
      .patch("/applications/a-1/review")
      .set(auth("student-token"))
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .patch("/applications/a-1/review")
      .send({ status: "APPROVED" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /applications/:id/answers
// ===========================================================================
describe("GET /applications/:id/answers", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("returns answers for own application", async () => {
    fakeDb.answers.push(
      { id: "ans-1", applicationId: "a-1", fieldId: "f-1", value: "Ivanov" },
      { id: "ans-2", applicationId: "a-1", fieldId: "f-2", value: "CS-101" },
    );

    const res = await request(app).get("/applications/a-1/answers").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app).get("/applications/a-1/answers").set(auth("other-token"));
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/applications/a-1/answers");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PUT /applications/:id/answers
// ===========================================================================
describe("PUT /applications/:id/answers", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("replaces answers atomically", async () => {
    const res = await request(app)
      .put("/applications/a-1/answers")
      .set(auth("student-token"))
      .send({ answers: [{ fieldId: "f-1", value: "Ivanov" }, { fieldId: "f-2", value: "CS-101" }] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(fakeDb.answers).toHaveLength(2);
  });

  it("returns 400 when answers is not an array", async () => {
    const res = await request(app)
      .put("/applications/a-1/answers")
      .set(auth("student-token"))
      .send({ answers: "not-array" });

    expect(res.status).toBe(400);
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app)
      .put("/applications/a-1/answers")
      .set(auth("other-token"))
      .send({ answers: [] });

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).put("/applications/a-1/answers").send({ answers: [] });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /applications/:id/doc-data
// ===========================================================================
describe("GET /applications/:id/doc-data", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("returns practice data for own application", async () => {
    fakeDb.practiceData.push({
      id: "pd-1",
      applicationId: "a-1",
      studentFullName: "Ivan Ivanov",
      groupName: "CS-101",
      docFields: { skill: "JS" },
      reportFileUrl: null,
      isReportApproved: false,
    });

    const res = await request(app).get("/applications/a-1/doc-data").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body.studentFullName).toBe("Ivan Ivanov");
  });

  it("returns 404 when practice data not found", async () => {
    const res = await request(app).get("/applications/a-1/doc-data").set(auth("student-token"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app).get("/applications/a-1/doc-data").set(auth("other-token"));
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/applications/a-1/doc-data");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /applications/:id/doc-data
// ===========================================================================
describe("PATCH /applications/:id/doc-data", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("updates studentFullName and groupName", async () => {
    const res = await request(app)
      .patch("/applications/a-1/doc-data")
      .set(auth("student-token"))
      .send({ studentFullName: "Ivan Ivanov", groupName: "CS-101" });

    expect(res.status).toBe(200);
    expect(res.body.studentFullName).toBe("Ivan Ivanov");
    expect(res.body.groupName).toBe("CS-101");
  });

  it("updates docFields", async () => {
    const res = await request(app)
      .patch("/applications/a-1/doc-data")
      .set(auth("student-token"))
      .send({ docFields: { skill: "React" } });

    expect(res.status).toBe(200);
    expect(res.body.docFields).toEqual({ skill: "React" });
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app)
      .patch("/applications/a-1/doc-data")
      .set(auth("other-token"))
      .send({ studentFullName: "X" });
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/applications/a-1/doc-data").send({ studentFullName: "X" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PUT /applications/:id/report
// ===========================================================================
describe("PUT /applications/:id/report", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("uploads report file URL", async () => {
    const res = await request(app)
      .put("/applications/a-1/report")
      .set(auth("student-token"))
      .send({ reportFileUrl: "https://s3.example.com/report.pdf" });

    expect(res.status).toBe(200);
    expect(res.body.reportFileUrl).toBe("https://s3.example.com/report.pdf");
  });

  it("resets approval on re-upload", async () => {
    // First upload
    await request(app)
      .put("/applications/a-1/report")
      .set(auth("student-token"))
      .send({ reportFileUrl: "https://s3.example.com/v1.pdf" });

    // Admin approves
    fakeDb.practiceData.find((p) => p.applicationId === "a-1")!.isReportApproved = true;

    // Re-upload
    const res = await request(app)
      .put("/applications/a-1/report")
      .set(auth("student-token"))
      .send({ reportFileUrl: "https://s3.example.com/v2.pdf" });

    expect(res.status).toBe(200);
    expect(res.body.reportFileUrl).toBe("https://s3.example.com/v2.pdf");
    expect(res.body.isReportApproved).toBe(false);
  });

  it("returns 400 when reportFileUrl missing", async () => {
    const res = await request(app)
      .put("/applications/a-1/report")
      .set(auth("student-token"))
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 403 for other student's application", async () => {
    const res = await request(app)
      .put("/applications/a-1/report")
      .set(auth("other-token"))
      .send({ reportFileUrl: "https://example.com/r.pdf" });
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).put("/applications/a-1/report").send({ reportFileUrl: "https://example.com/r.pdf" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// POST /applications/:id/report/approve
// ===========================================================================
describe("POST /applications/:id/report/approve", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("approves report", async () => {
    const res = await request(app)
      .post("/applications/a-1/report/approve")
      .set(auth("admin-token"));

    expect(res.status).toBe(200);
    expect(res.body.isReportApproved).toBe(true);
  });

  it("returns 404 for unknown application", async () => {
    const res = await request(app)
      .post("/applications/nope/report/approve")
      .set(auth("admin-token"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when student tries", async () => {
    const res = await request(app)
      .post("/applications/a-1/report/approve")
      .set(auth("student-token"));
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/applications/a-1/report/approve");
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// POST /applications/:id/report/reject
// ===========================================================================
describe("POST /applications/:id/report/reject", () => {
  beforeEach(() => {
    fakeDb.apps.push({
      id: "a-1",
      userId: "s-1",
      cohortId: "c-1",
      roleId: null,
      status: "PENDING",
      reviewComment: null,
      createdAt: new Date(),
    });
  });

  it("rejects report", async () => {
    const res = await request(app)
      .post("/applications/a-1/report/reject")
      .set(auth("admin-token"));

    expect(res.status).toBe(200);
    expect(res.body.isReportApproved).toBe(false);
  });

  it("returns 404 for unknown application", async () => {
    const res = await request(app)
      .post("/applications/nope/report/reject")
      .set(auth("admin-token"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when student tries", async () => {
    const res = await request(app)
      .post("/applications/a-1/report/reject")
      .set(auth("student-token"));
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).post("/applications/a-1/report/reject");
    expect(res.status).toBe(401);
  });
});

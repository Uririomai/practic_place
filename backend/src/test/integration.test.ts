import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { cleanDb, stopDb } from "./integration.dbUtils.js";
import { createInitialAdmin } from "../services/users.js";

const app = createApp();

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await cleanDb();
});

// ===========================================================================
// 0. Initial admin creation
// ===========================================================================
describe("createInitialAdmin", () => {
  it("creates admin user when env vars are set", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    process.env.ADMIN_PASSWORD = "adminpass123";

    await createInitialAdmin();

    const user = await prisma.user.findUnique({ where: { email: "admin@init.test" } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe("ADMIN");
    expect(user!.bcryptPassword).not.toBe("adminpass123"); // hashed
  });

  it("does not create duplicate admin on second call", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    process.env.ADMIN_PASSWORD = "adminpass123";

    await createInitialAdmin();
    await createInitialAdmin();

    const users = await prisma.user.findMany({ where: { email: "admin@init.test" } });
    expect(users).toHaveLength(1);
  });

  it("throws when ADMIN_EMAIL is missing", async () => {
    delete process.env.ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = "adminpass123";

    await expect(createInitialAdmin()).rejects.toThrow("ADMIN_EMAIL must be provided");
  });

  it("throws when ADMIN_PASSWORD is missing", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    delete process.env.ADMIN_PASSWORD;

    await expect(createInitialAdmin()).rejects.toThrow("ADMIN_PASSWORD must be provided");
  });
});

// ===========================================================================
// 1. Registration
// ===========================================================================
describe("POST /auth/register", () => {
  it("creates user as STUDENT and returns token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "student@test.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("student@test.com");
    expect(res.body.token).toBeTruthy();

    const dbUser = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.role).toBe("STUDENT");
    expect(dbUser!.bcryptPassword).not.toBe("secret12"); // hashed
  });

  it("creates admin user when role=ADMIN in body", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "admin@test.com", password: "adminpass" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@test.com");

    const dbUser = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
    expect(dbUser).not.toBeNull();
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.com", password: "secret12" });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.com", password: "secret12" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("USER_EXISTS");
  });

  it("returns 400 when email missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "secret12" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("EMAIL_OR_PASSWORD_NOT_SPECIFIED");
  });

  it("returns 400 when password missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "x@y.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("EMAIL_OR_PASSWORD_NOT_SPECIFIED");
  });

  it("returns 400 when body empty", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// Login
// ===========================================================================
describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "user@test.com", password: "secret12" });
  });

  it("returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@test.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("user@test.com");
    expect(res.body.token).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.com", password: "x" });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// Helpers for admin/student tokens
// ===========================================================================
let adminToken = "";
let studentToken = "";
let otherToken = "";

async function seedUsers() {
  const a = await request(app)
    .post("/auth/register")
    .send({ email: "admin@test.com", password: "adminpass" });
  adminToken = a.body.token;

  const s = await request(app)
    .post("/auth/register")
    .send({ email: "student@test.com", password: "secret12" });
  studentToken = s.body.token;

  const o = await request(app)
    .post("/auth/register")
    .send({ email: "other@test.com", password: "secret12" });
  otherToken = o.body.token;

  // Promote admin
  await prisma.user.update({
    where: { email: "admin@test.com" },
    data: { role: "ADMIN" },
  });
}

// ===========================================================================
// 2. Cohort management
// ===========================================================================
describe("POST /cohorts — admin creates cohort", () => {
  beforeEach(seedUsers);

  it("creates cohort and returns 201", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "2025-Поток",
        applicationStart: "2025-09-01",
        applicationEnd: "2025-09-30",
        practiceStart: "2025-10-01",
        practiceEnd: "2025-12-31",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("2025-Поток");
    expect(res.body.id).toBeTruthy();

    const dbCohort = await prisma.cohort.findUnique({ where: { id: res.body.id } });
    expect(dbCohort).not.toBeNull();
  });

  it("returns 403 when student tries to create cohort", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        name: "Hack",
        applicationStart: "2025-09-01",
        applicationEnd: "2025-09-30",
        practiceStart: "2025-10-01",
        practiceEnd: "2025-12-31",
      });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name missing", async () => {
    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ applicationStart: "2025-09-01" });
    expect(res.status).toBe(400);
  });
});

describe("GET /cohorts — admin lists cohorts", () => {
  beforeEach(seedUsers);

  it("returns empty list", async () => {
    const res = await request(app)
      .get("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns cohorts ordered by createdAt desc", async () => {
    const c1 = await prisma.cohort.create({
      data: { name: "Old", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });
    const c2 = await prisma.cohort.create({
      data: { name: "New", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });

    const res = await request(app)
      .get("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]!.name).toBe("New"); // desc
    expect(res.body[1]!.name).toBe("Old");
  });
});

describe("GET /cohorts/:id", () => {
  beforeEach(seedUsers);

  it("returns cohort by id", async () => {
    const c = await prisma.cohort.create({
      data: { name: "Demo", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });

    const res = await request(app)
      .get(`/cohorts/${c.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Demo");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .get("/cohorts/doesnotexist")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /cohorts/:id", () => {
  beforeEach(seedUsers);

  it("updates cohort name", async () => {
    const c = await prisma.cohort.create({
      data: { name: "Old", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });

    const res = await request(app)
      .patch(`/cohorts/${c.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Name" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");

    const db = await prisma.cohort.findUnique({ where: { id: c.id } });
    expect(db!.name).toBe("New Name");
  });
});

describe("DELETE /cohorts/:id", () => {
  beforeEach(seedUsers);

  it("deletes cohort", async () => {
    const c = await prisma.cohort.create({
      data: { name: "ToDelete", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });

    const res = await request(app)
      .delete(`/cohorts/${c.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const db = await prisma.cohort.findUnique({ where: { id: c.id } });
    expect(db).toBeNull();
  });
});

// ===========================================================================
// 3. Survey fields
// ===========================================================================
describe("Survey fields — admin manages fields", () => {
  let cohortId = "";

  beforeEach(async () => {
    await seedUsers();
    cohortId = (await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    })).id;
  });

  it("creates text field", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/fields`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Full Name", type: "text", order: 1 });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe("Full Name");

    const db = await prisma.surveyField.findUnique({ where: { id: res.body.id } });
    expect(db).not.toBeNull();
  });

  it("creates select field with options", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/fields`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Department", type: "select", options: ["IT", "HR"], order: 2 });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("select");
  });

  it("returns fields ordered by order", async () => {
    await prisma.surveyField.create({ data: { cohortId, label: "B", type: "text", order: 2 } });
    await prisma.surveyField.create({ data: { cohortId, label: "A", type: "text", order: 1 } });

    const res = await request(app)
      .get(`/cohorts/${cohortId}/fields`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body[0]!.label).toBe("A");
    expect(res.body[1]!.label).toBe("B");
  });

  it("reorders fields", async () => {
    const f1 = await prisma.surveyField.create({ data: { cohortId, label: "A", type: "text", order: 1 } });
    const f2 = await prisma.surveyField.create({ data: { cohortId, label: "B", type: "text", order: 2 } });

    const res = await request(app)
      .put(`/cohorts/${cohortId}/fields/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ items: [{ id: f1.id, order: 2 }, { id: f2.id, order: 1 }] });

    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// 4. Roles
// ===========================================================================
describe("Roles — admin configures roles", () => {
  let cohortId = "";

  beforeEach(async () => {
    await seedUsers();
    cohortId = (await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    })).id;
  });

  it("creates role", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Developer" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Developer");

    const db = await prisma.cohortRole.findUnique({ where: { id: res.body.id } });
    expect(db).not.toBeNull();
  });

  it("returns 403 when student tries to create role", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/roles`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Dev" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent cohort", async () => {
    const res = await request(app)
      .post("/cohorts/missing/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dev" });
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 5. Test tasks
// ===========================================================================
describe("Test tasks — admin manages test tasks", () => {
  let cohortId = "";

  beforeEach(async () => {
    await seedUsers();
    cohortId = (await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    })).id;
  });

  it("creates test task", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/test-tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Build a REST API" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Build a REST API");
  });

  it("returns 403 when student tries", async () => {
    const res = await request(app)
      .post(`/cohorts/${cohortId}/test-tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ content: "X" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent cohort", async () => {
    const res = await request(app)
      .post("/cohorts/missing/test-tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "X" });
    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 6. Application submission and full lifecycle
// ===========================================================================
describe("Full application lifecycle — user story", () => {
  let cohortId = "";
  let roleId = "";

  beforeEach(async () => {
    await seedUsers();

    // Set admin's active cohort
    const admin = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
    cohortId = (await prisma.cohort.create({
      data: { name: "2025-Поток", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    })).id;
    await prisma.user.update({ where: { id: admin!.id }, data: { activeCohortId: cohortId } });

    roleId = (await prisma.cohortRole.create({
      data: { cohortId, name: "Developer" },
    })).id;
  });

  it("submits application and admin approves", async () => {
    // Student submits application
    const app1 = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId, roleId });
    expect(app1.status).toBe(201);
    expect(app1.body.status).toBe("PENDING");
    const appId = app1.body.id;

    // Student fills answers
    const field = await prisma.surveyField.create({
      data: { cohortId, label: "Skill", type: "text", order: 1 },
    });
    const answersRes = await request(app)
      .put(`/applications/${appId}/answers`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [{ fieldId: field.id, value: "JavaScript" }] });
    expect(answersRes.status).toBe(200);

    // Admin reviews and approves
    const review = await request(app)
      .patch(`/applications/${appId}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });
    expect(review.status).toBe(200);
    expect(review.body.status).toBe("APPROVED");

    const dbApp = await prisma.application.findUnique({ where: { id: appId } });
    expect(dbApp!.status).toBe("APPROVED");
  });

  it("returns 409 for duplicate application", async () => {
    await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId });

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("already applied");
  });

  it("student fills doc data after application", async () => {
    const app1 = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId });
    const appId = app1.body.id;

    const docRes = await request(app)
      .patch(`/applications/${appId}/doc-data`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ studentFullName: "Ivan Ivanov", groupName: "CS-101" });
    expect(docRes.status).toBe(200);
    expect(docRes.body.studentFullName).toBe("Ivan Ivanov");

    const dbDoc = await prisma.practiceData.findUnique({ where: { applicationId: appId } });
    expect(dbDoc!.studentFullName).toBe("Ivan Ivanov");
  });

  it("admin assigns tasks, student uploads report, admin approves", async () => {
    const app1 = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId });
    const appId = app1.body.id;

    // Admin creates task
    const task = await request(app)
      .post(`/applications/${appId}/tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2025-10-01", title: "Setup project", description: "Init repo" });
    expect(task.status).toBe(201);
    expect(task.body.title).toBe("Setup project");

    // Student uploads report
    const report = await request(app)
      .put(`/applications/${appId}/report`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ reportFileUrl: "https://s3.example.com/report.pdf" });
    expect(report.status).toBe(200);
    expect(report.body.reportFileUrl).toBe("https://s3.example.com/report.pdf");

    // Admin approves report
    const approve = await request(app)
      .post(`/applications/${appId}/report/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.isReportApproved).toBe(true);

    const dbDoc = await prisma.practiceData.findUnique({ where: { applicationId: appId } });
    expect(dbDoc!.isReportApproved).toBe(true);
  });

  it("student views own tasks", async () => {
    const app1 = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId });
    const appId = app1.body.id;

    await request(app)
      .post(`/applications/${appId}/tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2025-10-01", title: "Task 1", description: "Do it" });
    await request(app)
      .post(`/applications/${appId}/tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2025-10-02", title: "Task 2", description: "Do it too" });

    const tasks = await request(app)
      .get(`/applications/${appId}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(tasks.status).toBe(200);
    expect(tasks.body).toHaveLength(2);
  });
});

// ===========================================================================
// Negative: access control
// ===========================================================================
describe("Negative — auth and access control", () => {
  beforeEach(seedUsers);

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/cohorts");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app).get("/cohorts").set("Authorization", "Bearer bad");
    expect(res.status).toBe(401);
  });

  it("student cannot access admin-only route (cohort list)", async () => {
    const res = await request(app).get("/cohorts").set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it("student cannot access other student's application", async () => {
    const cohort = await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });
    const application = await prisma.application.create({
      data: { userId: (await prisma.user.findUnique({ where: { email: "other@test.com" } }))!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it("student cannot review application", async () => {
    const cohort = await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });
    const application = await prisma.application.create({
      data: { userId: (await prisma.user.findUnique({ where: { email: "student@test.com" } }))!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .patch(`/applications/${application.id}/review`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ status: "APPROVED" });
    expect(res.status).toBe(403);
  });

  it("student cannot create tasks", async () => {
    const cohort = await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });
    const application = await prisma.application.create({
      data: { userId: (await prisma.user.findUnique({ where: { email: "student@test.com" } }))!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .post(`/applications/${application.id}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ date: "2025-10-01", title: "X" });
    expect(res.status).toBe(403);
  });

  it("student cannot approve report", async () => {
    const cohort = await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });
    const application = await prisma.application.create({
      data: { userId: (await prisma.user.findUnique({ where: { email: "other@test.com" } }))!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .post(`/applications/${application.id}/report/approve`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Profile
// ===========================================================================
describe("GET /me — profile", () => {
  beforeEach(seedUsers);

  it("returns current user", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("student@test.com");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /me — update profile", () => {
  beforeEach(seedUsers);

  it("sets activeCohortId", async () => {
    const cohort = await prisma.cohort.create({
      data: { name: "C", applicationStart: new Date(), applicationEnd: new Date(), practiceStart: new Date(), practiceEnd: new Date() },
    });

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ activeCohortId: cohort.id });
    expect(res.status).toBe(200);
    expect(res.body.activeCohortId).toBe(cohort.id);
  });
});

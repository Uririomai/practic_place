import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Test Tasks CRUD
// ===========================================================================
describe("GET /cohorts/:cohortId/test-tasks", () => {
  it("lists test tasks for admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "Build something" },
    });

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBe("Build something");
  });

  it("allows student with application to view", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "Secret task" },
    });

    const student = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    await prisma.application.create({
      data: { userId: student!.id, cohortId: cohort.id, roleId: role.id },
    });

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("forbids student without application", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

describe("POST /cohorts/:cohortId/test-tasks", () => {
  it("creates test task as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleId: role.id, content: "Fix the bug" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Fix the bug");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ roleId: role.id, content: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .post("/cohorts/00000000-0000-0000-0000-000000000000/test-tasks")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleId: "x", content: "Test" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when content missing", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/test-tasks`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ roleId: role.id });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /cohorts/:cohortId/test-tasks/:id", () => {
  it("updates test task as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    const task = await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "Old" },
    });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/test-tasks/${task.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Updated");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    const task = await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "X" },
    });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/test-tasks/${task.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ content: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing task", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/test-tasks/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Nope" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /cohorts/:cohortId/test-tasks/:id", () => {
  it("deletes test task as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    const task = await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "Delete me" },
    });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/test-tasks/${task.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Dev" } });
    const task = await prisma.testTask.create({
      data: { cohortId: cohort.id, roleId: role.id, content: "X" },
    });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/test-tasks/${task.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

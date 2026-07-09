import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Task Cards CRUD
// ===========================================================================
async function seedApplication(studentToken: string) {
  const cohort = await seedCohort();
  const res = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ cohortId: cohort.id });
  return { cohort, applicationId: res.body.id };
}

describe("GET /applications/:id/tasks", () => {
  it("lists tasks for application owner", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it("allows admin to view tasks", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it("forbids other student", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .get(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

describe("POST /applications/:id/tasks", () => {
  it("creates task for application owner", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .post(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        date: "2026-06-01T00:00:00.000Z",
        title: "Setup environment",
        description: "Install tools",
        artifactLink: "https://github.com/test",
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Setup environment");
  });

  it("returns 409 for duplicate date", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    await request(app)
      .post(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ date: "2026-06-01T00:00:00.000Z", title: "First", description: "A" });

    const res = await request(app)
      .post(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ date: "2026-06-01T00:00:00.000Z", title: "Second", description: "B" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("TASK_ALREADY_EXISTS");
  });

  it("forbids other student", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .post(`/applications/${applicationId}/tasks`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ date: "2026-06-01T00:00:00.000Z", title: "Hack", description: "X" });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /applications/:id/tasks/:taskId", () => {
  it("updates own task", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const task = await prisma.taskCard.create({
      data: {
        applicationId,
        date: new Date("2026-06-01"),
        title: "Old",
        description: "Old desc",
      },
    });

    const res = await request(app)
      .patch(`/applications/${applicationId}/tasks/${task.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ title: "New title" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("New title");
  });

  it("allows admin to update any task", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const task = await prisma.taskCard.create({
      data: {
        applicationId,
        date: new Date("2026-06-01"),
        title: "Old",
        description: "Desc",
      },
    });

    const res = await request(app)
      .patch(`/applications/${applicationId}/tasks/${task.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Admin updated" });

    expect(res.status).toBe(200);
  });

  it("forbids other student", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const task = await prisma.taskCard.create({
      data: {
        applicationId,
        date: new Date("2026-06-01"),
        title: "X",
        description: "D",
      },
    });

    const res = await request(app)
      .patch(`/applications/${applicationId}/tasks/${task.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing task", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .patch(`/applications/${applicationId}/tasks/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ title: "Nope" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /applications/:id/tasks/:taskId", () => {
  it("deletes task as admin", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const task = await prisma.taskCard.create({
      data: {
        applicationId,
        date: new Date("2026-06-01"),
        title: "Delete me",
        description: "Desc",
      },
    });

    const res = await request(app)
      .delete(`/applications/${applicationId}/tasks/${task.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("forbids student from deleting", async () => {
    const { studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const task = await prisma.taskCard.create({
      data: {
        applicationId,
        date: new Date("2026-06-01"),
        title: "X",
        description: "D",
      },
    });

    const res = await request(app)
      .delete(`/applications/${applicationId}/tasks/${task.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing task", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const { applicationId } = await seedApplication(studentToken);

    const res = await request(app)
      .delete(`/applications/${applicationId}/tasks/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

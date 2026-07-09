import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Cohorts CRUD
// ===========================================================================
describe("GET /cohorts", () => {
  it("lists cohorts for admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(cohort.id);
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/cohorts")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/cohorts");
    expect(res.status).toBe(401);
  });
});

describe("GET /cohorts/active", () => {
  it("returns active cohorts", async () => {
    await seedUsers();
    const { studentToken } = await seedUsers();

    const cohort = await prisma.cohort.create({
      data: {
        name: "Active",
        applicationStart: new Date("2025-01-01"),
        applicationEnd: new Date("2099-12-31"),
        practiceStart: new Date("2025-06-01"),
        practiceEnd: new Date("2025-08-31"),
      },
    });

    const res = await request(app)
      .get("/cohorts/active")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(cohort.id);
  });

  it("returns empty when no active cohorts", async () => {
    await seedUsers();
    const { studentToken } = await seedUsers();

    await prisma.cohort.create({
      data: {
        name: "Past",
        applicationStart: new Date("2020-01-01"),
        applicationEnd: new Date("2020-12-31"),
        practiceStart: new Date("2020-06-01"),
        practiceEnd: new Date("2020-08-31"),
      },
    });

    const res = await request(app)
      .get("/cohorts/active")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("POST /cohorts", () => {
  it("creates cohort as admin", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Новый поток",
        applicationStart: "2026-01-01T00:00:00.000Z",
        applicationEnd: "2026-12-31T00:00:00.000Z",
        practiceStart: "2026-06-01T00:00:00.000Z",
        practiceEnd: "2026-08-31T00:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Новый поток");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Test" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when name missing", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .post("/cohorts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        applicationStart: "2026-01-01T00:00:00.000Z",
        applicationEnd: "2026-12-31T00:00:00.000Z",
        practiceStart: "2026-06-01T00:00:00.000Z",
        practiceEnd: "2026-08-31T00:00:00.000Z",
      });

    expect(res.status).toBe(400);
  });
});

describe("GET /cohorts/:id", () => {
  it("returns cohort for admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(cohort.id);
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .get("/cohorts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /cohorts/:id", () => {
  it("updates cohort as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .patch("/cohorts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /cohorts/:id", () => {
  it("deletes cohort as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const db = await prisma.cohort.findUnique({ where: { id: cohort.id } });
    expect(db).toBeNull();
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .delete("/cohorts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 409 when cohort has applications", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const student = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    await prisma.application.create({
      data: { userId: student!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });
});

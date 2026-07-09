import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Roles CRUD
// ===========================================================================
describe("GET /cohorts/:cohortId/roles", () => {
  it("lists roles for admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Developer" } });

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/roles`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Developer");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/roles`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

describe("POST /cohorts/:cohortId/roles", () => {
  it("creates role as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Designer" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Designer");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/roles`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when name missing", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/roles`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .post("/cohorts/00000000-0000-0000-0000-000000000000/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /cohorts/:cohortId/roles/:id", () => {
  it("updates role as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "Old" } });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/roles/${role.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "X" } });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/roles/${role.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ name: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing role", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/roles/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /cohorts/:cohortId/roles/:id", () => {
  it("deletes role as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "DeleteMe" } });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/roles/${role.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const db = await prisma.cohortRole.findUnique({ where: { id: role.id } });
    expect(db).toBeNull();
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({ data: { cohortId: cohort.id, name: "X" } });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/roles/${role.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing role", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/roles/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

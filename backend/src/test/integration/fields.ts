import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Survey Fields CRUD
// ===========================================================================
describe("GET /cohorts/:cohortId/fields", () => {
  it("lists fields for any authenticated user", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "Why you?", type: "TEXT", order: 1 },
    });

    const res = await request(app)
      .get(`/cohorts/${cohort.id}/fields`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].label).toBe("Why you?");
  });

  it("returns 404 for missing cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .get("/cohorts/00000000-0000-0000-0000-000000000000/fields")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /cohorts/:cohortId/fields", () => {
  it("creates field as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/fields`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Experience", type: "TEXTAREA", order: 1 });

    expect(res.status).toBe(201);
    expect(res.body.label).toBe("Experience");
    expect(res.body.type).toBe("TEXTAREA");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/fields`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ label: "Hack", type: "TEXT" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when label missing", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post(`/cohorts/${cohort.id}/fields`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "TEXT" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /cohorts/:cohortId/fields/order", () => {
  it("reorders fields as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const f1 = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "A", type: "TEXT", order: 1 },
    });
    const f2 = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "B", type: "TEXT", order: 2 },
    });

    const res = await request(app)
      .put(`/cohorts/${cohort.id}/fields/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [
          { id: f1.id, order: 2 },
          { id: f2.id, order: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const updated = await prisma.surveyField.findUnique({ where: { id: f1.id } });
    expect(updated!.order).toBe(2);
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .put(`/cohorts/${cohort.id}/fields/order`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ items: [] });

    expect(res.status).toBe(403);
  });

  it("returns 400 when items missing", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .put(`/cohorts/${cohort.id}/fields/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when field belongs to different cohort", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const otherCohort = await seedCohort();

    const res = await request(app)
      .put(`/cohorts/${otherCohort.id}/fields/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{ id: "00000000-0000-0000-0000-000000000000", order: 1 }],
      });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /cohorts/:cohortId/fields/:id", () => {
  it("updates field as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const field = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "Old", type: "TEXT", order: 1 },
    });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/fields/${field.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe("Updated");
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const field = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "X", type: "TEXT", order: 1 },
    });

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/fields/${field.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ label: "Hack" });

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing field", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch(`/cohorts/${cohort.id}/fields/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ label: "Nope" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /cohorts/:cohortId/fields/:id", () => {
  it("deletes field as admin", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();
    const field = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "DeleteMe", type: "TEXT", order: 1 },
    });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/fields/${field.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const db = await prisma.surveyField.findUnique({ where: { id: field.id } });
    expect(db).toBeNull();
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const field = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "X", type: "TEXT", order: 1 },
    });

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/fields/${field.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing field", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .delete(`/cohorts/${cohort.id}/fields/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

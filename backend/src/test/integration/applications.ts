import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Applications CRUD
// ===========================================================================
describe("POST /applications", () => {
  it("creates application for student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    expect(res.status).toBe(201);
    expect(res.body.cohortId).toBe(cohort.id);
    expect(res.body.status).toBe("PENDING");
  });

  it("returns 400 for duplicate application", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("APPLICATION_EXISTS");
  });

  it("returns 404 for missing cohort", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app)
      .post("/applications")
      .send({ cohortId: "x" });

    expect(res.status).toBe(401);
  });
});

describe("GET /applications", () => {
  it("lists own applications for student", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].cohortId).toBe(cohort.id);
  });

  it("lists all applications for admin with active cohort", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    // Set admin's active cohort
    await prisma.user.update({
      where: { email: "admin@test.com" },
      data: { activeCohortId: cohort.id },
    });

    // Student creates application
    await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("returns 400 for admin without active cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ACTIVE_COHORT_NOT_SET");
  });

  it("returns empty list for student with no applications", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("GET /applications/:id", () => {
  it("returns application for owner", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .get(`/applications/${created.body.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("allows admin to view any application", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .get(`/applications/${created.body.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it("forbids other student from viewing", async () => {
    const { studentToken } = await seedUsers();
    const { otherToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .get(`/applications/${created.body.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing application", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/applications/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /applications/:id/review", () => {
  it("approves application with roleId", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const role = await prisma.cohortRole.create({
      data: { cohortId: cohort.id, name: "Developer" },
    });

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .patch(`/applications/${created.body.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED", roleId: role.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
    expect(res.body.roleId).toBe(role.id);
  });

  it("returns 400 when approving without roleId", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .patch(`/applications/${created.body.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ROLE_REQUIRED");
  });

  it("rejects application with comment", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .patch(`/applications/${created.body.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "REJECTED", reviewComment: "Not qualified" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");
    expect(res.body.reviewComment).toBe("Not qualified");
  });

  it("returns 400 when rejecting without comment", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .patch(`/applications/${created.body.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "REJECTED" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("COMMENT_REQUIRED");
  });

  it("returns 400 for invalid status", async () => {
    const { adminToken, studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .patch(`/applications/${created.body.id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "INVALID" });

    expect(res.status).toBe(400);
  });

  // ponytail: current code doesn't check role on review — anyone with the ID can review
  // add when real auth is enforced on this route
});

describe("PUT /applications/:id/answers", () => {
  it("saves answers for application owner", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const field = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "Why?", type: "TEXT", order: 1 },
    });

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .put(`/applications/${created.body.id}/answers`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [{ fieldId: field.id, value: "Because" }] });

    expect(res.status).toBe(200);
    expect(res.body.answers).toHaveLength(1);
    expect(res.body.answers[0].value).toBe("Because");
  });

  it("returns 403 for non-owner", async () => {
    const { studentToken, otherToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .put(`/applications/${created.body.id}/answers`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ answers: [] });

    expect(res.status).toBe(403);
  });

  it("returns 400 when answers is not an array", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    const res = await request(app)
      .put(`/applications/${created.body.id}/answers`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: "not-an-array" });

    expect(res.status).toBe(400);
  });

  it("replaces existing answers", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const f1 = await prisma.surveyField.create({
      data: { cohortId: cohort.id, label: "Q1", type: "TEXT", order: 1 },
    });

    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ cohortId: cohort.id });

    // First save
    await request(app)
      .put(`/applications/${created.body.id}/answers`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [{ fieldId: f1.id, value: "First" }] });

    // Replace
    const res = await request(app)
      .put(`/applications/${created.body.id}/answers`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [{ fieldId: f1.id, value: "Second" }] });

    expect(res.status).toBe(200);
    expect(res.body.answers).toHaveLength(1);
    expect(res.body.answers[0].value).toBe("Second");
  });
});

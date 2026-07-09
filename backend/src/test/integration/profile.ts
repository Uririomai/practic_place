import { describe, it, expect } from "vitest";
import { app, request, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Profile
// ===========================================================================
describe("GET /me", () => {
  it("returns profile with valid token", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("student@test.com");
    expect(res.body.role).toBe("STUDENT");
    expect(res.body.id).toBeTruthy();
    expect(res.body.activeCohortId).toBeNull();
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with bad token", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /me", () => {
  it("allows admin to change active cohort", async () => {
    const { adminToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ activeCohortId: cohort.id });

    expect(res.status).toBe(200);
    expect(res.body.activeCohortId).toBe(cohort.id);
  });

  it("forbids student from changing active cohort", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ activeCohortId: cohort.id });

    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent cohort", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .patch("/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ activeCohortId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(404);
  });
});

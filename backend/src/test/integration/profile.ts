import { describe, it, expect } from "vitest";
import { app, request, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Profile
// ===========================================================================
describe("GET /me", () => {
  it("returns current user object", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("role");
    expect(res.body).toHaveProperty("activeCohortId");
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).not.toHaveProperty("applications");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /me/profile", () => {
  it("redirects to /users/:id/profile", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/me/profile")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(301);
    expect(res.headers.location).toMatch(/^\/users\/[^/]+\/profile$/);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/me/profile");
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

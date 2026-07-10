import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers, seedCohort } from "../integration.helpers.js";

// ===========================================================================
// Users CRUD
// ===========================================================================
describe("GET /users/:id", () => {
  it("returns own user", async () => {
    const { studentToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "student@test.com" } });

    const res = await request(app)
      .get(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("student@test.com");
    expect(res.body.role).toBe("STUDENT");
    expect(res.body.id).toBe(user!.id);
  });

  it("returns other user for admin", async () => {
    const { adminToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .get(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("other@test.com");
  });

  it("returns 404 for missing user", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/users/some-id");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /users/:id", () => {
  it("updates own profile", async () => {
    const { studentToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "student@test.com" } });

    const res = await request(app)
      .patch(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ profile: { fio: "Иванов Иван Иванович", phone: "+7..." } });

    expect(res.status).toBe(200);
    expect(res.body.profile.fio).toBe("Иванов Иван Иванович");
    expect(res.body.profile.phone).toBe("+7...");
  });

  it("merges profile instead of full replace", async () => {
    const { studentToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "student@test.com" } });

    await request(app)
      .patch(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ profile: { fio: "Иванов" } });

    const res = await request(app)
      .patch(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ profile: { phone: "+7999" } });

    expect(res.status).toBe(200);
    expect(res.body.profile.fio).toBe("Иванов");
    expect(res.body.profile.phone).toBe("+7999");
  });

  it("forbids student from updating another user", async () => {
    const { studentToken } = await seedUsers();
    const other = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .patch(`/users/${other!.id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ profile: { fio: "Hacked" } });

    expect(res.status).toBe(403);
  });

  it("allows admin to update any user", async () => {
    const { adminToken } = await seedUsers();
    const other = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .patch(`/users/${other!.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ profile: { fio: "Admin changed" } });

    expect(res.status).toBe(200);
    expect(res.body.profile.fio).toBe("Admin changed");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/users/some-id").send({ profile: {} });
    expect(res.status).toBe(401);
  });
});

describe("DELETE /users/:id", () => {
  it("deletes user as admin", async () => {
    const { adminToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .delete(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const db = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(db).toBeNull();
  });

  it("forbids student", async () => {
    const { studentToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .delete(`/users/${user!.id}`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for missing user", async () => {
    const { adminToken } = await seedUsers();

    const res = await request(app)
      .delete("/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// Rich Profile
// ===========================================================================
describe("GET /users/:id/profile", () => {
  it("returns rich profile with user, cohorts, roles", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const user = await prisma.user.findUnique({ where: { email: "student@test.com" } });

    // cohorts/roles derived from user's applications — create one
    await prisma.application.create({
      data: { userId: user!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .get(`/users/${user!.id}/profile`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user!.id);
    expect(res.body.user.email).toBe("student@test.com");
    expect(res.body.user.profile).toEqual(null);

    expect(Array.isArray(res.body.applications)).toBe(true);
    expect(res.body.applications).toHaveLength(1);

    expect(Array.isArray(res.body.cohorts)).toBe(true);
    expect(res.body.cohorts).toHaveLength(1);
    expect(res.body.cohorts[0].id).toBe(cohort.id);

    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(Array.isArray(res.body.documents)).toBe(true);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it("returns 404 for missing user", async () => {
    const { studentToken } = await seedUsers();

    const res = await request(app)
      .get("/users/00000000-0000-0000-0000-000000000000/profile")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });

  it("includes application fields with test placeholder", async () => {
    const { studentToken } = await seedUsers();
    const cohort = await seedCohort();
    const user = await prisma.user.findUnique({ where: { email: "student@test.com" } });

    await prisma.application.create({
      data: { userId: user!.id, cohortId: cohort.id },
    });

    const res = await request(app)
      .get(`/users/${user!.id}/profile`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].userId).toBe(user!.id);
    expect(res.body.applications[0].cohortId).toBe(cohort.id);
    expect(res.body.applications[0].status).toBe("PENDING");
    expect(res.body.applications[0].surveyData).toEqual({});
    expect(res.body.applications[0].test).toEqual({ status: null, answer: null });
  });

  it("returns empty arrays for user with no data", async () => {
    const { otherToken } = await seedUsers();
    const user = await prisma.user.findUnique({ where: { email: "other@test.com" } });

    const res = await request(app)
      .get(`/users/${user!.id}/profile`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(0);
    expect(res.body.documents).toHaveLength(0);
    expect(res.body.tasks).toHaveLength(0);
    expect(res.body.cohorts).toHaveLength(0);
    expect(res.body.roles).toHaveLength(0);
  });
});
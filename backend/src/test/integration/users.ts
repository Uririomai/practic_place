import { describe, it, expect } from "vitest";
import { app, request, prisma, seedUsers } from "../integration.helpers.js";

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
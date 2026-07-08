import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { cleanDb, stopDb } from "./integration.dbUtils.js";
import { createInitialAdmin } from "../services/users.js";

const app = createApp();

beforeAll(async () => {
  await cleanDb();
});

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await cleanDb();
});

// ===========================================================================
// 0. Initial admin creation
// ===========================================================================
describe("createInitialAdmin", () => {
  it("creates admin user when env vars are set", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    process.env.ADMIN_PASSWORD = "adminpass123";

    await createInitialAdmin();

    const user = await prisma.user.findUnique({ where: { email: "admin@init.test" } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe("ADMIN");
    expect(user!.bcryptPassword).not.toBe("adminpass123"); // hashed
  });

  it("does not create duplicate admin on second call", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    process.env.ADMIN_PASSWORD = "adminpass123";

    await createInitialAdmin();
    await createInitialAdmin();

    const users = await prisma.user.findMany({ where: { email: "admin@init.test" } });
    expect(users).toHaveLength(1);
  });

  it("throws when ADMIN_EMAIL is missing", async () => {
    delete process.env.ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = "adminpass123";

    await expect(createInitialAdmin()).rejects.toThrow("ADMIN_EMAIL must be provided");
  });

  it("throws when ADMIN_PASSWORD is missing", async () => {
    process.env.ADMIN_EMAIL = "admin@init.test";
    delete process.env.ADMIN_PASSWORD;

    await expect(createInitialAdmin()).rejects.toThrow("ADMIN_PASSWORD must be provided");
  });
});

// ===========================================================================
// 1. Registration
// ===========================================================================
describe("POST /auth/register", () => {
  it("creates user as STUDENT and returns token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "student@test.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("student@test.com");
    expect(res.body.token).toBeTruthy();

    const dbUser = await prisma.user.findUnique({ where: { email: "student@test.com" } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.role).toBe("STUDENT");
    expect(dbUser!.bcryptPassword).not.toBe("secret12"); // hashed
  });

  it("creates admin user when role=ADMIN in body", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "admin@test.com", password: "adminpass" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@test.com");

    const dbUser = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
    expect(dbUser).not.toBeNull();
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.com", password: "secret12" });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dup@test.com", password: "secret12" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("USER_EXISTS");
  });

  it("returns 400 when email missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "secret12" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("EMAIL_OR_PASSWORD_NOT_SPECIFIED");
  });

  it("returns 400 when password missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "x@y.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("EMAIL_OR_PASSWORD_NOT_SPECIFIED");
  });

  it("returns 400 when body empty", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// Login
// ===========================================================================
describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "user@test.com", password: "secret12" });
  });

  it("returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@test.com", password: "secret12" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("user@test.com");
    expect(res.body.token).toBeTruthy();
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.com", password: "x" });
    expect(res.status).toBe(401);
  });
});
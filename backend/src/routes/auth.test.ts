import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

const fakeDb = vi.hoisted(() => {
  return {
    users: [] as Array<{
      id: string;
      email: string;
      bcryptPassword: string | null;
      role: string;
      createdAt: Date;
    }>,
  };
});

vi.mock("bcryptjs", () => ({
  default: {
    hash: async (password: string) => `hashed:${password}`,
    compare: async (password: string, hash: string) =>
      hash === `hashed:${password}`,
  },
}));

vi.mock("../lib/jwt.js", () => ({
  signToken: ({ sub }: { sub: string }) => `token-for-${sub}`,
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { email: string };
      }) => {
        return (
          fakeDb.users.find(
            (user) => user.email === where.email,
          ) ?? null
        );
      },

      create: async ({
        data,
      }: {
        data: {
          email: string;
          bcryptPassword: string;
        };
      }) => {
        const user = {
          id: `id-${fakeDb.users.length + 1}`,
          email: data.email,
          bcryptPassword: data.bcryptPassword,
          role: "STUDENT",
          createdAt: new Date(),
        };

        fakeDb.users.push(user);

        return user;
      },
    },
  },
}));

import { createApp } from "../app.js";

const app = createApp();

beforeEach(() => {
  fakeDb.users.length = 0;
});

describe("POST /auth/register", () => {
  it("creates user and returns token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "a@b.com",
        password: "secret",
      });

    expect(res.status).toBe(200);

    expect(res.body.user.email).toBe("a@b.com");
    expect(res.body.token).toBe("token-for-id-1");

    expect(fakeDb.users).toHaveLength(1);
    expect(fakeDb.users[0]?.bcryptPassword).toBe("hashed:secret");
  });

  it("returns 409 for duplicate email", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "dup@b.com",
        password: "secret",
      });

    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "dup@b.com",
        password: "secret",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("user exists");
  });

  it("returns 400 when password missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "x@y.com",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 when body empty", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("returns token for valid credentials", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "user@b.com",
        password: "secret",
      });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "user@b.com",
        password: "secret",
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("user@b.com");
    expect(res.body.token).toBe("token-for-id-1");
  });

  it("returns 401 for wrong password", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        email: "wp@b.com",
        password: "secret",
      });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "wp@b.com",
        password: "wrong",
      });

    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "none@test.com",
        password: "secret",
      });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        password: "secret",
      });

    expect(res.status).toBe(400);
  });
});

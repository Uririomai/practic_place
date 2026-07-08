import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------
const fakeDb = vi.hoisted(() => ({
  users: [] as Array<{
    id: string;
    email: string;
    role: string;
    activeCohortId: string | null;
    createdAt: Date;
  }>,
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("../lib/jwt.js", () => ({
  verifyToken: (token: string) => {
    if (token === "student-token") return { sub: "s-1", email: "s@test.com" };
    throw new Error("invalid");
  },
  signToken: () => "mock-token",
}));

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
        fakeDb.users.find((u) => u.id === where.id || u.email === where.email) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const u = fakeDb.users.find((u) => u.id === where.id);
        if (!u) throw new Error("not found");
        Object.assign(u, data);
        return u;
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
import { createApp } from "../app.js";

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  fakeDb.users.length = 0;
  fakeDb.users.push({
    id: "s-1",
    email: "s@test.com",
    role: "STUDENT",
    activeCohortId: null,
    createdAt: new Date(),
  });
});

// ===========================================================================
// GET /me
// ===========================================================================
describe("GET /me", () => {
  it("returns current user profile", async () => {
    const res = await request(app).get("/me").set(auth("student-token"));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("s-1");
    expect(res.body.email).toBe("s@test.com");
    expect(res.body.role).toBe("STUDENT");
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app).get("/me").set(auth("bad-token"));
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /me
// ===========================================================================
describe("PATCH /me", () => {
  it("updates activeCohortId", async () => {
    const res = await request(app)
      .patch("/me")
      .set(auth("student-token"))
      .send({ activeCohortId: "c-42" });

    expect(res.status).toBe(200);
    expect(res.body.activeCohortId).toBe("c-42");
  });

  it("sets activeCohortId to null", async () => {
    // First set a cohort
    await request(app)
      .patch("/me")
      .set(auth("student-token"))
      .send({ activeCohortId: "c-42" });

    // Then clear it
    const res = await request(app)
      .patch("/me")
      .set(auth("student-token"))
      .send({ activeCohortId: null });

    expect(res.status).toBe(200);
    expect(res.body.activeCohortId).toBeNull();
  });

  it("returns 401 without token", async () => {
    const res = await request(app).patch("/me").send({ activeCohortId: "c-42" });
    expect(res.status).toBe(401);
  });
});
import { describe, it, expect } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { createInitialAdmin } from "../../services/users.js";

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

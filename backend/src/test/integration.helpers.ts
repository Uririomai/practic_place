import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { signToken } from "../lib/jwt.js";
import { cleanDb, stopDb } from "./integration.dbUtils.js";

export { request, prisma, cleanDb, stopDb };

export const app = createApp();

export async function seedUsers() {
  const hash = await bcrypt.hash("secret1234", 4); // ponytail: low rounds for tests

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { role: "ADMIN", bcryptPassword: hash },
    create: { email: "admin@test.com", bcryptPassword: hash, role: "ADMIN" },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@test.com" },
    update: { role: "STUDENT", bcryptPassword: hash },
    create: { email: "student@test.com", bcryptPassword: hash, role: "STUDENT" },
  });

  const otherUser = await prisma.user.upsert({
    where: { email: "other@test.com" },
    update: { role: "STUDENT", bcryptPassword: hash },
    create: { email: "other@test.com", bcryptPassword: hash, role: "STUDENT" },
  });

  const adminToken = signToken({ sub: adminUser.id, email: adminUser.email, role: "ADMIN" });
  const studentToken = signToken({ sub: studentUser.id, email: studentUser.email, role: "STUDENT" });
  const otherToken = signToken({ sub: otherUser.id, email: otherUser.email, role: "STUDENT" });

  return { adminToken, studentToken, otherToken };
}

export async function seedCohort(name?: string) {
  const cohort = await prisma.cohort.create({
    data: {
      name: name ?? "Поток 2026",
      applicationStart: new Date("2026-01-01"),
      applicationEnd: new Date("2026-12-31"),
      practiceStart: new Date("2026-06-01"),
      practiceEnd: new Date("2026-08-31"),
    },
  });
  return cohort;
}

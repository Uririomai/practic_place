import { prisma } from "../lib/prisma.js";

const TABLES = [
  "TaskCard",
  "PracticeData",
  "ApplicationAnswer",
  "SurveyField",
  "Application",
  "CohortRole",
  "TestTask",
  "Cohort",
  "User",
] as const;

/** Clean all tables in FK-safe order. Call in beforeEach. */
export async function cleanDb() {
  for (const t of TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
  }
}

/** Disconnect Prisma. Call in afterAll. */
export async function stopDb() {
  await prisma.$disconnect();
}
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";


export async function cleanDb() {
  const modelNames = Object.values(Prisma.ModelName);

  // Если у вас есть модели, которые нужно пропустить (например, системные), 
  // их можно отфильтровать здесь
  const tables = modelNames
    .map((name) => `"${name}"`)
    .join(", ");

  if (tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`
    );
  }
}

/** Disconnect Prisma. Call in afterAll. */
export async function stopDb() {
  await prisma.$disconnect();
}

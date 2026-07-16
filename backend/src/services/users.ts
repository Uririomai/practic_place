import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { $Enums } from "@prisma/client";


export async function createInitialAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error(
      "ADMIN_EMAIL must be provided to create initial admin",
    );
  }
  else if (!password) {
    throw new Error(
      "ADMIN_PASSWORD must be provided to create initial admin"
    )
  }

  const adminExists = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  if (adminExists) {
    return;
  }

  await createUser(email, password, "ADMIN");

  logger.info("Initial admin created");
}


export async function createUser(email: string, password: string, role: $Enums.UserRole = $Enums.UserRole.STUDENT) {
  const exists = await prisma.user.findUnique({ where: { email } });

  if (password.length < 6)
    throw new AppError("PASSWORD_TOO_SHORT", 409, "Password must contain at least 6 characters and one uppercase letter")

  // ponytail: single-pass check, uppercase only
  if (!/[A-Z]/.test(password))
    throw new AppError("PASSWORD_NO_UPPERCASE", 409, "Password must contain at least one uppercase letter")
  if (exists)
    throw new AppError("USER_EXISTS", 409, "user exists")

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      bcryptPassword: hashed,
      role: role
    },
  });

  return user
}

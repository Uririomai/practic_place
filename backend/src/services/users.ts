import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
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

  console.log("Initial admin created");
}


export async function createUser(email: string, password: string, role: $Enums.UserRole = $Enums.UserRole.STUDENT) {
  const exists = await prisma.user.findUnique({ where: { email } });

  if (password.length < 8)
    throw new AppError("PASSWORD_TOO_SHORT", 409, "Password must contain at least 8 characters")
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

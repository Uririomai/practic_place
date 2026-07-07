export type FakeUser = {
  id: string;
  email: string;
  bcrypt_password: string | null;
  role: string;
  createdAt: Date;
};

export function createFakePrisma() {
  const users: FakeUser[] = [];

  const prisma = {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { email: string };
      }) => {
        return users.find((u) => u.email === where.email) ?? null;
      },

      create: async ({
        data,
      }: {
        data: {
          email: string;
          bcrypt_password: string;
        };
      }) => {
        const user: FakeUser = {
          id: `id-${users.length + 1}`,
          email: data.email,
          bcrypt_password: data.bcrypt_password,
          role: "STUDENT",
          createdAt: new Date(),
        };

        users.push(user);

        return user;
      },
    },
  };

  return {
    prisma,
    users,
    reset() {
      users.length = 0;
    },
  };
}

import { Prisma } from '@prisma/client';

export const USER_ACCESS_INCLUDE = Prisma.validator<Prisma.UserInclude>()({
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
});

export type UserWithAccess = Prisma.UserGetPayload<{ include: typeof USER_ACCESS_INCLUDE }>;

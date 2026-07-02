import { Prisma } from '@prisma/client';

export const ROLE_PERMISSIONS_INCLUDE = Prisma.validator<Prisma.RoleInclude>()({
  rolePermissions: { include: { permission: true } },
});

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof ROLE_PERMISSIONS_INCLUDE;
}>;

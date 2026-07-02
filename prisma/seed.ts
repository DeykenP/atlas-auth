import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ name: string; description: string }> = [
  { name: 'users:read', description: 'View user accounts' },
  { name: 'users:write', description: 'Update user accounts' },
  { name: 'users:delete', description: 'Soft-delete user accounts' },
  { name: 'roles:read', description: 'View roles' },
  { name: 'roles:write', description: 'Create, update, and delete roles' },
  { name: 'roles:assign', description: 'Assign or revoke roles on a user' },
  { name: 'permissions:read', description: 'View permissions' },
  { name: 'permissions:write', description: 'Create and delete permissions' },
  { name: 'sessions:read', description: "View any user's active sessions" },
  { name: 'sessions:revoke', description: "Revoke any user's sessions" },
  { name: 'audit:read', description: 'View audit logs' },
];

async function main(): Promise<void> {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      create: permission,
      update: { description: permission.description },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    create: { name: 'admin', description: 'Full administrative access' },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: 'user' },
    create: { name: 'user', description: 'Standard authenticated user' },
    update: {},
  });

  const allPermissions = await prisma.permission.findMany();
  await Promise.all(
    allPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        create: { roleId: adminRole.id, permissionId: permission.id },
        update: {},
      }),
    ),
  );

  console.log(`Seeded ${PERMISSIONS.length} permissions and roles "admin" (all permissions), "user" (none).`);

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEmail) {
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!adminUser) {
      console.warn(
        `ADMIN_EMAIL is set to "${adminEmail}" but no user with that email exists yet. ` +
          'Register that account first, then re-run "npx prisma db seed" to grant admin.',
      );
    } else {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        create: { userId: adminUser.id, roleId: adminRole.id },
        update: {},
      });
      console.log(`Granted "admin" role to ${adminEmail}.`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

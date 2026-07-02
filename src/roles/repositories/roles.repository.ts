import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ROLE_PERMISSIONS_INCLUDE,
  RoleWithPermissions,
} from '../interfaces/role-with-permissions.interface';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      include: ROLE_PERMISSIONS_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({ where: { id }, include: ROLE_PERMISSIONS_INCLUDE });
  }

  findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { name } });
  }

  create(data: { name: string; description?: string }): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  update(id: string, data: { name?: string; description?: string }): Promise<Role> {
    return this.prisma.role.update({ where: { id }, data });
  }

  delete(id: string): Promise<Role> {
    return this.prisma.role.delete({ where: { id } });
  }

  assignPermission(roleId: string, permissionId: string): Promise<void> {
    return this.prisma.rolePermission
      .upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId },
        update: {},
      })
      .then(() => undefined);
  }

  revokePermission(roleId: string, permissionId: string): Promise<void> {
    return this.prisma.rolePermission
      .delete({ where: { roleId_permissionId: { roleId, permissionId } } })
      .then(() => undefined);
  }

  assignToUser(userId: string, roleId: string): Promise<void> {
    return this.prisma.userRole
      .upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId },
        update: {},
      })
      .then(() => undefined);
  }

  revokeFromUser(userId: string, roleId: string): Promise<void> {
    return this.prisma.userRole
      .delete({ where: { userId_roleId: { userId, roleId } } })
      .then(() => undefined);
  }
}

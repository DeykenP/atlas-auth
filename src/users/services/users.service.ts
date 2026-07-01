import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from '../repositories/users.repository';
import { UserWithAccess } from '../interfaces/user-with-access.interface';

export interface RolesAndPermissions {
  roles: string[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  extractRolesAndPermissions(user: UserWithAccess): RolesAndPermissions {
    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const permissions = new Set<string>();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.name);
      }
    }

    return { roles, permissions: Array.from(permissions) };
  }
}

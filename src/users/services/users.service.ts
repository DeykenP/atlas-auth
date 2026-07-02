import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { HashingService } from '../../common/hashing/hashing.service';
import { UsersRepository } from '../repositories/users.repository';
import { UserWithAccess } from '../interfaces/user-with-access.interface';
import { UpdateProfileDto } from '../dto/update-profile.dto';

export interface RolesAndPermissions {
  roles: string[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashingService: HashingService,
  ) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.getProfile(userId);
    return this.usersRepository.updateProfile(userId, dto);
  }

  /** Confirms the caller knows the account password before sensitive changes. */
  async assertPasswordMatches(userId: string, password: string): Promise<User> {
    const user = await this.getProfile(userId);
    const matches = await this.hashingService.verify(user.passwordHash, password);
    if (!matches) {
      throw new UnauthorizedException('Incorrect password');
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

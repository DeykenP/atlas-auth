import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionsRepository } from '../../permissions/repositories/permissions.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { RolesRepository } from '../repositories/roles.repository';
import { RoleWithPermissions } from '../interfaces/role-with-permissions.interface';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll(): Promise<RoleWithPermissions[]> {
    return this.rolesRepository.findAll();
  }

  async findByIdOrThrow(id: string): Promise<RoleWithPermissions> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<RoleWithPermissions> {
    const existing = await this.rolesRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists`);
    }
    const role = await this.rolesRepository.create(dto);
    return this.findByIdOrThrow(role.id);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleWithPermissions> {
    await this.findByIdOrThrow(id);
    await this.rolesRepository.update(id, dto);
    return this.findByIdOrThrow(id);
  }

  async remove(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    await this.rolesRepository.delete(id);
  }

  async assignPermission(roleId: string, permissionId: string): Promise<RoleWithPermissions> {
    await this.findByIdOrThrow(roleId);
    const permission = await this.permissionsRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.rolesRepository.assignPermission(roleId, permissionId);
    return this.findByIdOrThrow(roleId);
  }

  async revokePermission(roleId: string, permissionId: string): Promise<RoleWithPermissions> {
    await this.findByIdOrThrow(roleId);
    await this.rolesRepository.revokePermission(roleId, permissionId);
    return this.findByIdOrThrow(roleId);
  }

  async assignToUser(userId: string, roleId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.findByIdOrThrow(roleId);
    await this.rolesRepository.assignToUser(userId, roleId);
  }

  async revokeFromUser(userId: string, roleId: string): Promise<void> {
    await this.rolesRepository.revokeFromUser(userId, roleId);
  }
}

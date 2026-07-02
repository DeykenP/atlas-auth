import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { CreatePermissionDto } from '../dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  findAll(): Promise<Permission[]> {
    return this.permissionsRepository.findAll();
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Permission "${dto.name}" already exists`);
    }
    return this.permissionsRepository.create(dto);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionsRepository.delete(id);
  }
}

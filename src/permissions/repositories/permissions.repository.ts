import { Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { name } });
  }

  create(data: { name: string; description?: string }): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({ where: { id } });
  }
}

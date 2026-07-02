import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Permission } from '@prisma/client';

@Exclude()
export class PermissionResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  constructor(permission: Permission) {
    this.id = permission.id;
    this.name = permission.name;
    this.description = permission.description;
    this.createdAt = permission.createdAt;
  }
}

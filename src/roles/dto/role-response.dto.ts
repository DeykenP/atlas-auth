import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { RoleWithPermissions } from '../interfaces/role-with-permissions.interface';

@Exclude()
export class RoleResponseDto {
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
  @ApiProperty({ type: [String] })
  permissions: string[];

  @Expose()
  @ApiProperty()
  createdAt: Date;

  constructor(role: RoleWithPermissions) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description;
    this.permissions = role.rolePermissions.map((rp) => rp.permission.name);
    this.createdAt = role.createdAt;
  }
}

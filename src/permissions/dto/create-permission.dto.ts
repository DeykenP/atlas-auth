import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users:read', description: 'Convention: resource:action' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/, {
    message: 'name must follow the "resource:action" convention, e.g. "users:read"',
  })
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

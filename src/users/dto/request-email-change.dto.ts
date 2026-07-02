import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'new.address@example.com' })
  @IsEmail()
  newEmail!: string;

  @ApiProperty({ description: 'Current password, required to confirm identity' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the verification email link' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

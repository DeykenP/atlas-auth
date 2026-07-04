import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the password reset email link' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'N3w!Str0ngPassw0rd', minLength: 8 })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}

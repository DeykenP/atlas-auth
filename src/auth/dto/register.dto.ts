import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ng!Passw0rd', minLength: 8 })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;

  @ApiProperty({ required: false, example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}

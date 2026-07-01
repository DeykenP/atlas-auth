import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User } from '@prisma/client';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  firstName: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  lastName: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  avatarUrl: string | null;

  @Expose()
  @ApiProperty()
  isEmailVerified: boolean;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.avatarUrl = user.avatarUrl;
    this.isEmailVerified = user.isEmailVerified;
    this.createdAt = user.createdAt;
  }
}

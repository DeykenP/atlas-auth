import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  constructor(accessToken: string, expiresAt: Date, user: UserResponseDto) {
    this.accessToken = accessToken;
    this.expiresAt = expiresAt;
    this.user = user;
  }
}

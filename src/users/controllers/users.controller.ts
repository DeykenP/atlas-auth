import { Controller, Get, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@CurrentUser('sub') userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.getProfile(userId);
    return new UserResponseDto(user);
  }
}

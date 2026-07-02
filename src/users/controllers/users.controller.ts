import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmailVerificationService } from '../../auth/services/email-verification.service';
import { UsersService } from '../services/users.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { RequestEmailChangeDto } from '../dto/request-email-change.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  async getMe(@CurrentUser('sub') userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.getProfile(userId);
    return new UserResponseDto(user);
  }

  @Patch('me')
  @ApiOkResponse({ type: UserResponseDto })
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateProfile(userId, dto);
    return new UserResponseDto(user);
  }

  @Post('me/email-change')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({
    description: 'A confirmation link has been sent to the new address',
  })
  async requestEmailChange(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    await this.usersService.assertPasswordMatches(userId, dto.password);
    await this.emailVerificationService.requestEmailChange(userId, dto.newEmail);
    return { message: 'Confirmation email sent to the new address' };
  }
}

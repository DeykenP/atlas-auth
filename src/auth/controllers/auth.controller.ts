import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { Public } from '../decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RequestContext } from '../interfaces/request-context.interface';
import { AuthService } from '../services/auth.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { PasswordService } from '../services/password.service';
import { BRUTE_FORCE_THROTTLE } from '../constants/brute-force-throttle.constant';

@ApiTags('auth')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.register(dto, this.getContext(req));
    this.setRefreshCookie(res, tokens.refreshToken.token, tokens.refreshToken.expiresAt);
    return new AuthResponseDto(
      tokens.accessToken.token,
      tokens.accessToken.expiresAt,
      new UserResponseDto(user),
    );
  }

  @Public()
  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(dto, this.getContext(req));
    this.setRefreshCookie(res, tokens.refreshToken.token, tokens.refreshToken.expiresAt);
    return new AuthResponseDto(
      tokens.accessToken.token,
      tokens.accessToken.expiresAt,
      new UserResponseDto(user),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshTokenPlain = req.signedCookies?.[this.cookieName] as string | undefined;
    if (!refreshTokenPlain) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { user, tokens } = await this.authService.refresh(
      refreshTokenPlain,
      this.getContext(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken.token, tokens.refreshToken.expiresAt);
    return new AuthResponseDto(
      tokens.accessToken.token,
      tokens.accessToken.expiresAt,
      new UserResponseDto(user),
    );
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Email verified (or email change applied)' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.emailVerificationService.verify(dto.token, this.getContext(req));
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOkResponse({ description: 'A fresh verification email has been queued' })
  async resendVerification(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.emailVerificationService.sendRegistrationVerification(user.sub, user.email);
    return { message: 'Verification email sent' };
  }

  @Public()
  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOkResponse({ description: 'If the email exists, a reset link has been sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.passwordService.requestReset(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  @Public()
  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password reset; all sessions have been revoked' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.passwordService.resetPassword(dto.token, dto.newPassword, this.getContext(req));
    return { message: 'Password reset successfully. Please log in again.' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password changed; other sessions have been revoked' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.passwordService.changePassword(
      user.sub,
      user.sessionId,
      dto.currentPassword,
      dto.newPassword,
      this.getContext(req),
    );
    return { message: 'Password changed successfully' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshTokenPlain = req.signedCookies?.[this.cookieName] as string | undefined;
    await this.authService.logout(
      { sub: user.sub, sessionId: user.sessionId },
      refreshTokenPlain,
      user.jti,
      user.exp,
      this.getContext(req),
    );
    res.clearCookie(this.cookieName, this.getCookieOptions());
  }

  private get cookieName(): string {
    return this.config.getOrThrow<string>('security.refreshTokenCookieName');
  }

  private getContext(req: Request): RequestContext {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('security.cookieSecure'),
      sameSite: 'lax',
      path: `/${this.config.getOrThrow<string>('app.apiPrefix')}/auth`,
      signed: true,
    };
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(this.cookieName, token, { ...this.getCookieOptions(), expires: expiresAt });
  }
}

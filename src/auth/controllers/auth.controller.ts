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
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { Public } from '../decorators/public.decorator';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RequestContext } from '../interfaces/request-context.interface';
import { AuthService } from '../services/auth.service';

@ApiTags('auth')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
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

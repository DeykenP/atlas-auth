import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
      issuer: configService.getOrThrow<string>('jwt.issuer'),
      audience: configService.getOrThrow<string>('jwt.audience'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return payload;
  }
}

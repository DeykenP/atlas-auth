import { randomBytes, randomUUID, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { parseDurationToMs } from '../../common/utils/duration.util';

export interface SignedAccessToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export interface GeneratedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(payload: Omit<JwtPayload, 'jti'>): Promise<SignedAccessToken> {
    const jti = randomUUID();
    const expiresIn = this.config.getOrThrow<string>('jwt.accessExpiresIn');
    const expiresInMs = parseDurationToMs(expiresIn);
    const token = await this.jwtService.signAsync(
      { ...payload },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: Math.floor(expiresInMs / 1000),
        issuer: this.config.getOrThrow<string>('jwt.issuer'),
        audience: this.config.getOrThrow<string>('jwt.audience'),
        jwtid: jti,
      },
    );
    return { token, jti, expiresAt: new Date(Date.now() + expiresInMs) };
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    const expiresIn = this.config.getOrThrow<string>('jwt.refreshExpiresIn');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + parseDurationToMs(expiresIn)),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getAccessTokenTtlMs(): number {
    return parseDurationToMs(this.config.getOrThrow<string>('jwt.accessExpiresIn'));
  }

  getRefreshTokenTtlMs(): number {
    return parseDurationToMs(this.config.getOrThrow<string>('jwt.refreshExpiresIn'));
  }
}

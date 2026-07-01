import { Injectable } from '@nestjs/common';
import { Device, RefreshToken, Session } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertDevice(params: {
    userId: string;
    fingerprint: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Device> {
    const { userId, fingerprint, userAgent, ipAddress } = params;
    return this.prisma.device.upsert({
      where: { userId_fingerprint: { userId, fingerprint } },
      create: { userId, fingerprint, userAgent, ipAddress },
      update: { lastSeenAt: new Date(), userAgent, ipAddress },
    });
  }

  createSession(params: {
    userId: string;
    deviceId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({ data: params });
  }

  findSessionById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  revokeSession(id: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  touchSession(id: string, expiresAt: Date): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { lastActiveAt: new Date(), expiresAt },
    });
  }

  createRefreshToken(params: {
    userId: string;
    sessionId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    createdByIp?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: params });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(id: string, replacedByTokenHash?: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedByTokenHash },
    });
  }

  revokeRefreshTokenFamily(familyId: string): Promise<{ count: number }> {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

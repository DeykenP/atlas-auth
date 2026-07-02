import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  SESSION_DEVICE_INCLUDE,
  SessionWithDevice,
} from '../interfaces/session-with-device.interface';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUser(userId: string): Promise<SessionWithDevice[]> {
    return this.prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      include: SESSION_DEVICE_INCLUDE,
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  findById(id: string): Promise<SessionWithDevice | null> {
    return this.prisma.session.findUnique({ where: { id }, include: SESSION_DEVICE_INCLUDE });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Revokes every active session for the user except the one to keep. */
  async revokeAllExcept(userId: string, keptSessionId: string): Promise<string[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isRevoked: false, id: { not: keptSessionId } },
      select: { id: true },
    });
    const sessionIds = sessions.map((session) => session.id);
    if (sessionIds.length === 0) {
      return [];
    }

    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { id: { in: sessionIds } },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return sessionIds;
  }
}

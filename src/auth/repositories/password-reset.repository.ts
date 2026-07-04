import { Injectable } from '@nestjs/common';
import { PasswordResetToken } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestedByIp?: string;
  }): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({ data: params });
  }

  findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  markConsumed(id: string): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async invalidateOutstanding(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}

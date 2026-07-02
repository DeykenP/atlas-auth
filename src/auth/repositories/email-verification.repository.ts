import { Injectable } from '@nestjs/common';
import { EmailTokenType, EmailVerificationToken } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: {
    userId: string;
    tokenHash: string;
    type: EmailTokenType;
    newEmail?: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.create({ data: params });
  }

  findByHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  }

  markConsumed(id: string): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  /** Invalidates any outstanding tokens of the given type before issuing a new one. */
  async invalidateOutstanding(userId: string, type: EmailTokenType): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}

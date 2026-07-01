import { Injectable } from '@nestjs/common';
import { LoginStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LoginHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: {
    userId?: string;
    email: string;
    status: LoginStatus;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ id: string }> {
    return this.prisma.loginHistory.create({
      data: entry,
      select: { id: true },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { USER_ACCESS_INCLUDE, UserWithAccess } from '../interfaces/user-with-access.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  findWithAccessById(id: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_ACCESS_INCLUDE,
    });
  }

  markEmailVerified(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isEmailVerified: true },
    });
  }

  recordSuccessfulLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  async registerFailedLoginAttempt(
    id: string,
    maxAttempts: number,
    lockDurationMinutes: number,
  ): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= maxAttempts;

    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + lockDurationMinutes * 60 * 1000)
          : user.lockedUntil,
      },
    });
  }

  updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}

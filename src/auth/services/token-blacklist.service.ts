import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

const JTI_PREFIX = 'auth:blacklist:jti:';
const SESSION_PREFIX = 'auth:blacklist:session:';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async blacklist(jti: string, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }
    await this.redis.set(`${JTI_PREFIX}${jti}`, '1', ttlMs);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return this.redis.exists(`${JTI_PREFIX}${jti}`);
  }

  /**
   * Blocks every access token bound to a revoked session. Only needs to
   * outlive the longest possible remaining access-token lifetime.
   */
  async blacklistSession(sessionId: string, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }
    await this.redis.set(`${SESSION_PREFIX}${sessionId}`, '1', ttlMs);
  }

  async isSessionBlacklisted(sessionId: string): Promise<boolean> {
    return this.redis.exists(`${SESSION_PREFIX}${sessionId}`);
  }
}

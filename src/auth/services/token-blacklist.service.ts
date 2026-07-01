import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

const BLACKLIST_PREFIX = 'auth:blacklist:jti:';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async blacklist(jti: string, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }
    await this.redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', ttlMs);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return this.redis.exists(`${BLACKLIST_PREFIX}${jti}`);
  }
}

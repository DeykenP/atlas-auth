import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis, { Result } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

// Matches @nestjs/throttler's ThrottlerStorageRecord, which the package
// doesn't export from its public entrypoint.
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

declare module 'ioredis' {
  interface RedisCommander<Context> {
    throttlerIncrement(
      hitsKey: string,
      blockKey: string,
      ttlMs: number,
      limit: number,
      blockDurationMs: number,
    ): Result<[number, number, number, number], Context>;
  }
}

// Atomic in Redis so concurrent requests from the same key can't race past the limit.
const INCREMENT_SCRIPT = `
local totalHits = redis.call('INCR', KEYS[1])
if totalHits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local timeToExpire = redis.call('PTTL', KEYS[1])

local blockTtl = redis.call('PTTL', KEYS[2])
local isBlocked = 0
if blockTtl > 0 then
  isBlocked = 1
elseif totalHits > tonumber(ARGV[2]) and tonumber(ARGV[3]) > 0 then
  redis.call('SET', KEYS[2], 1, 'PX', ARGV[3])
  isBlocked = 1
  blockTtl = tonumber(ARGV[3])
end

return {totalHits, timeToExpire, isBlocked, blockTtl}
`;

/**
 * Redis-backed ThrottlerStorage so rate limits are shared across every app
 * instance behind a load balancer. The default in-memory storage keeps a
 * separate counter per process, which silently multiplies the effective
 * limit by the replica count.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
    this.client.defineCommand('throttlerIncrement', {
      numberOfKeys: 2,
      lua: INCREMENT_SCRIPT,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:${key}:blocked`;

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] =
      await this.client.throttlerIncrement(hitsKey, blockKey, ttl, limit, blockDuration);

    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    };
  }
}

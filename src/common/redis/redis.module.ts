import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './redis-throttler-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger('RedisClient');
        const client = new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          tls: config.get<boolean>('redis.tls') ? {} : undefined,
          lazyConnect: false,
        });
        client.on('error', (error) => logger.error(`Redis connection error: ${error.message}`));
        client.on('connect', () => logger.log('Redis connection established'));
        return client;
      },
    },
    RedisService,
    RedisThrottlerStorage,
  ],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  securityConfig,
  mailConfig,
  loggingConfig,
  envValidationSchema,
} from './config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { HashingModule } from './common/hashing/hashing.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { createWinstonOptions } from './common/logger/winston.config';
import { RedisThrottlerStorage } from './common/redis/redis-throttler-storage.service';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        securityConfig,
        mailConfig,
        loggingConfig,
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createWinstonOptions({
          level: config.getOrThrow<string>('logging.level'),
          isProduction: config.getOrThrow<boolean>('app.isProduction'),
        }),
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (config: ConfigService, storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('security.throttle.ttlSeconds') * 1000,
            limit: config.getOrThrow<number>('security.throttle.limit'),
          },
        ],
        storage,
      }),
    }),
    DatabaseModule,
    RedisModule,
    HashingModule,
    AuditLogModule,
    MailModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    SessionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

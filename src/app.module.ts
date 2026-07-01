import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  securityConfig,
  mailConfig,
  envValidationSchema,
} from './config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, securityConfig, mailConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}

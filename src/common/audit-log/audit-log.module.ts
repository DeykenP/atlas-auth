import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { LoginHistoryRepository } from './login-history.repository';
import { AuditListener } from './audit.listener';

@Global()
@Module({
  providers: [AuditLogRepository, LoginHistoryRepository, AuditListener],
  exports: [AuditLogRepository, LoginHistoryRepository],
})
export class AuditLogModule {}

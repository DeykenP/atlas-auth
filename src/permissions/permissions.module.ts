import { Module } from '@nestjs/common';
import { PermissionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { PermissionsRepository } from './repositories/permissions.repository';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsRepository],
  exports: [PermissionsService, PermissionsRepository],
})
export class PermissionsModule {}

import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RolesRepository } from './repositories/roles.repository';

@Module({
  imports: [PermissionsModule, UsersModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}

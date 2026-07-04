import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService],
})
export class SessionsModule {}

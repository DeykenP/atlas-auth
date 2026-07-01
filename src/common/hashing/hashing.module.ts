import { Global, Module } from '@nestjs/common';
import { HashingService } from './hashing.service';

@Global()
@Module({
  providers: [HashingService],
  exports: [HashingService],
})
export class HashingModule {}

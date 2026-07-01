import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  constructor(private readonly config: ConfigService) {}

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.config.get<number>('security.argon2.memoryCost'),
      timeCost: this.config.get<number>('security.argon2.timeCost'),
      parallelism: this.config.get<number>('security.argon2.parallelism'),
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}

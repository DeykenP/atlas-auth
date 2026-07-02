import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { SessionWithDevice } from '../interfaces/session-with-device.interface';

@Exclude()
export class SessionResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  ipAddress: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  userAgent: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true, description: 'Device name, if labelled' })
  deviceName: string | null;

  @Expose()
  @ApiProperty({ description: 'True when this is the session making the request' })
  isCurrent: boolean;

  @Expose()
  @ApiProperty()
  lastActiveAt: Date;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  expiresAt: Date;

  constructor(session: SessionWithDevice, currentSessionId: string) {
    this.id = session.id;
    this.ipAddress = session.ipAddress;
    this.userAgent = session.userAgent;
    this.deviceName = session.device?.name ?? null;
    this.isCurrent = session.id === currentSessionId;
    this.lastActiveAt = session.lastActiveAt;
    this.createdAt = session.createdAt;
    this.expiresAt = session.expiresAt;
  }
}

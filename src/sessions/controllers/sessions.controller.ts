import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { RequestContext } from '../../auth/interfaces/request-context.interface';
import { SessionsService } from '../services/sessions.service';
import { SessionResponseDto } from '../dto/session-response.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOkResponse({ type: [SessionResponseDto] })
  async listSessions(@CurrentUser() user: JwtPayload): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionsService.listActive(user.sub);
    return sessions.map((session) => new SessionResponseDto(session, user.sessionId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.sessionsService.revokeSession(user.sub, id, this.getContext(req));
  }

  @Delete()
  @ApiOkResponse({
    description: 'Revokes every session except the current one; returns the revoked count',
    schema: { type: 'object', properties: { revokedCount: { type: 'number' } } },
  })
  async revokeAllOtherSessions(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<{ revokedCount: number }> {
    const revokedCount = await this.sessionsService.revokeAllOtherSessions(
      user.sub,
      user.sessionId,
      this.getContext(req),
    );
    return { revokedCount };
  }

  private getContext(req: Request): RequestContext {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }
}

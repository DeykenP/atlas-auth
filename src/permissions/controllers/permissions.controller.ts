import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { PermissionResponseDto } from '../dto/permission-response.dto';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions:read')
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsService.findAll();
    return permissions.map((permission) => new PermissionResponseDto(permission));
  }

  @Post()
  @RequirePermissions('permissions:write')
  @ApiCreatedResponse({ type: PermissionResponseDto })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const permission = await this.permissionsService.create(dto);
    return new PermissionResponseDto(permission);
  }

  @Delete(':id')
  @RequirePermissions('permissions:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.permissionsService.remove(id);
  }
}

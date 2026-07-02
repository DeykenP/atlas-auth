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
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { RoleResponseDto } from '../dto/role-response.dto';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOkResponse({ type: [RoleResponseDto] })
  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesService.findAll();
    return roles.map((role) => new RoleResponseDto(role));
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOkResponse({ type: RoleResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleResponseDto> {
    const role = await this.rolesService.findByIdOrThrow(id);
    return new RoleResponseDto(role);
  }

  @Post()
  @RequirePermissions('roles:write')
  @ApiCreatedResponse({ type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rolesService.create(dto);
    return new RoleResponseDto(role);
  }

  @Patch(':id')
  @RequirePermissions('roles:write')
  @ApiOkResponse({ type: RoleResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.update(id, dto);
    return new RoleResponseDto(role);
  }

  @Delete(':id')
  @RequirePermissions('roles:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:write')
  @ApiOkResponse({ type: RoleResponseDto })
  async assignPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionDto,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.assignPermission(id, dto.permissionId);
    return new RoleResponseDto(role);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('roles:write')
  @ApiOkResponse({ type: RoleResponseDto })
  async revokePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.rolesService.revokePermission(id, permissionId);
    return new RoleResponseDto(role);
  }

  @Post(':id/users/:userId')
  @RequirePermissions('roles:assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignToUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.rolesService.assignToUser(userId, id);
  }

  @Delete(':id/users/:userId')
  @RequirePermissions('roles:assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeFromUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.rolesService.revokeFromUser(userId, id);
  }
}

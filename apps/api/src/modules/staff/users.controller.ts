import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantUser, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { TenantUsersService } from './tenant-users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: TenantUsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List tenant login accounts' })
  @ApiOkResponse({ description: 'Tenant users' })
  async findAll(@TenantId() tenantId: string): Promise<{ data: TenantUser[] }> {
    const data = await this.usersService.findAll(tenantId);
    return { data };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create tenant login account' })
  @ApiOkResponse({ description: 'Created user' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ): Promise<TenantUser> {
    return this.usersService.create(tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant user (role, active, password, staff link)' })
  @ApiOkResponse({ description: 'Updated user' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
  ): Promise<TenantUser> {
    return this.usersService.update(tenantId, id, dto);
  }
}

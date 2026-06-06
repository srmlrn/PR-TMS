import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, VolunteerShift, AuthUser } from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateVolunteerShiftDto } from './dto/create-volunteer-shift.dto';
import { VolunteerService } from './volunteer.service';

@ApiTags('volunteer')
@ApiBearerAuth()
@Controller('volunteer')
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  @Get('shifts')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'List volunteer shifts' })
  @ApiOkResponse({ description: 'Volunteer shifts with signups' })
  async findAll(@TenantId() tenantId: string): Promise<{ data: VolunteerShift[] }> {
    const data = await this.volunteerService.findAll(tenantId);
    return { data };
  }

  @Post('shifts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a volunteer shift (admin)' })
  @ApiCreatedResponse({ description: 'Created shift' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateVolunteerShiftDto,
  ): Promise<VolunteerShift> {
    return this.volunteerService.create(tenantId, dto);
  }

  @Post('shifts/:id/signup')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Sign up for a volunteer shift' })
  @ApiOkResponse({ description: 'Shift with updated signups' })
  async signup(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerShift> {
    return this.volunteerService.signup(tenantId, id, user);
  }

  @Post('shifts/:id/checkin')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check in to a signed-up volunteer shift' })
  @ApiOkResponse({ description: 'Shift with check-in recorded' })
  async checkin(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerShift> {
    return this.volunteerService.checkin(tenantId, id, user);
  }
}

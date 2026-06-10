import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthUser,
  GenerateEventShiftsResult,
  NotifyEventVolunteersResult,
  UserRole,
  VolunteerCategory,
  VolunteerCertificate,
  VolunteerOpportunity,
  VolunteerPreferences,
  VolunteerShift,
  VolunteerStats,
} from '@tms/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateVolunteerShiftDto } from './dto/create-volunteer-shift.dto';
import { NotifyEventVolunteersDto } from './dto/notify-event-volunteers.dto';
import { UpdateVolunteerPreferencesDto } from './dto/update-volunteer-preferences.dto';
import { generateVolunteerCertificatePdf } from '../../common/utils/volunteer-certificate-pdf.util';
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
  async findAll(
    @TenantId() tenantId: string,
    @Query('category') category?: VolunteerCategory,
  ): Promise<{ data: VolunteerShift[] }> {
    const data = await this.volunteerService.findAll(tenantId, category);
    return { data };
  }

  @Get('opportunities')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Upcoming events needing volunteers with slot counts' })
  @ApiOkResponse({ description: 'Volunteer opportunities aggregated by event' })
  async getOpportunities(
    @TenantId() tenantId: string,
    @Query('category') category?: VolunteerCategory,
  ): Promise<{ data: VolunteerOpportunity[] }> {
    const data = await this.volunteerService.getOpportunities(tenantId, category);
    return { data };
  }

  @Get('shifts/event/:eventId')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'List volunteer shifts for a specific event' })
  @ApiOkResponse({ description: 'Shifts linked to event' })
  async findByEvent(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ data: VolunteerShift[] }> {
    const data = await this.volunteerService.findByEvent(tenantId, eventId);
    return { data };
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Recurring seva shift templates (e.g. Sunday annadanam)' })
  @ApiOkResponse({ description: 'Recurring template shifts' })
  async getTemplates(@TenantId() tenantId: string): Promise<{ data: VolunteerShift[] }> {
    const data = await this.volunteerService.getRecurringTemplates(tenantId);
    return { data };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Volunteer hours and badge stats for current user' })
  @ApiOkResponse({ description: 'Volunteer recognition stats' })
  async getStats(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerStats> {
    return this.volunteerService.getStats(tenantId, user);
  }

  @Get('certificates')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'List downloadable seva certificates for current volunteer' })
  @ApiOkResponse({ description: 'Earned volunteer certificates' })
  async listCertificates(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ data: VolunteerCertificate[] }> {
    return this.volunteerService.listCertificates(tenantId, user);
  }

  @Get('certificates/:id/file.pdf')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Download volunteer certificate as PDF' })
  async getCertificatePdf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const cert = await this.volunteerService.getCertificate(tenantId, user, id);
    const pdf = await generateVolunteerCertificatePdf(cert);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="seva-certificate-${cert.certificateNumber}.pdf"`,
    );
    res.send(pdf);
  }

  @Get('certificates/:id')
  @Roles(UserRole.ADMIN, UserRole.VOLUNTEER)
  @ApiOperation({ summary: 'Get volunteer certificate metadata' })
  @ApiOkResponse({ description: 'Certificate details' })
  async getCertificate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerCertificate> {
    return this.volunteerService.getCertificate(tenantId, user, id);
  }

  @Get('preferences')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Volunteer notification and role preferences' })
  @ApiOkResponse({ description: 'User volunteer preferences' })
  getPreferences(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): VolunteerPreferences {
    return this.volunteerService.getPreferences(tenantId, user.id);
  }

  @Patch('preferences')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update volunteer preferences' })
  @ApiOkResponse({ description: 'Updated preferences' })
  updatePreferences(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateVolunteerPreferencesDto,
  ): VolunteerPreferences {
    return this.volunteerService.updatePreferences(tenantId, user.id, dto);
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

  @Post('events/:eventId/generate-shifts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Auto-generate default volunteer shifts for an event' })
  @ApiCreatedResponse({ description: 'Generated shifts' })
  async generateEventShifts(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<GenerateEventShiftsResult> {
    return this.volunteerService.generateEventShifts(tenantId, eventId, user);
  }

  @Post('events/:eventId/notify')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Notify volunteers about an event (invite or roster reminder)' })
  @ApiOkResponse({ description: 'Notification delivery counts' })
  async notifyEventVolunteers(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string,
    @Body() dto: NotifyEventVolunteersDto,
  ): Promise<NotifyEventVolunteersResult> {
    return this.volunteerService.notifyEventVolunteers(
      tenantId,
      eventId,
      dto.audience ?? 'interested',
    );
  }

  @Post('shifts/:id/signup')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Sign up for a volunteer shift (waitlist if full)' })
  @ApiOkResponse({ description: 'Shift with updated signups' })
  async signup(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerShift> {
    return this.volunteerService.signup(tenantId, id, user);
  }

  @Post('shifts/:id/cancel-signup')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Withdraw from a volunteer shift' })
  @ApiOkResponse({ description: 'Shift with signup removed' })
  async cancelSignup(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerShift> {
    return this.volunteerService.cancelSignup(tenantId, id, user);
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

  @Post('shifts/:id/checkout')
  @Roles(UserRole.VOLUNTEER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check out and log hours for a volunteer shift' })
  @ApiOkResponse({ description: 'Shift with checkout and hours logged' })
  async checkout(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<VolunteerShift> {
    return this.volunteerService.checkout(tenantId, id, user);
  }
}

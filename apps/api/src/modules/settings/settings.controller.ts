import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  PosProduct,
  SevaService,
  TenantBranding,
  TenantBrandingSettingsPublic,
  TenantPaymentSettingsPublic,
  TenantScheduleSettings,
  UserRole,
} from '@tms/types';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { SevaCatalogService } from '../booking/seva-catalog.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { UpdateBrandingSettingsDto } from './dto/update-branding-settings.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import {
  CreateSevaServiceSettingsDto,
  UpdateSevaServiceSettingsDto,
} from './dto/seva-service-settings.dto';
import {
  CreatePosProductSettingsDto,
  UpdatePosProductSettingsDto,
} from './dto/pos-product-settings.dto';
import { PosCatalogService } from './pos-catalog.service';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';
import { TenantSiteSettingsService } from './tenant-site-settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly paymentSettings: TenantPaymentSettingsService,
    private readonly siteSettings: TenantSiteSettingsService,
    private readonly sevaCatalog: SevaCatalogService,
    private readonly posCatalog: PosCatalogService,
  ) {}

  @Get('payments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get tenant payment provider settings (secrets masked)' })
  @ApiResponse({ status: 200, description: 'Public payment settings for current tenant' })
  getPaymentSettings(@TenantId() tenantId: string): Promise<TenantPaymentSettingsPublic> {
    return this.paymentSettings.getPublicSettings(tenantId);
  }

  @Patch('payments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant Stripe payment settings' })
  @ApiResponse({ status: 200, description: 'Updated payment settings' })
  updatePaymentSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdatePaymentSettingsDto,
  ): Promise<TenantPaymentSettingsPublic> {
    return this.paymentSettings.updateSettings(tenantId, dto);
  }

  @Get('branding')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get tenant branding overrides and merged preview' })
  getBrandingSettings(@TenantId() tenantId: string): Promise<TenantBrandingSettingsPublic> {
    return this.siteSettings.getBrandingSettings(tenantId);
  }

  @Patch('branding')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant branding and display labels' })
  updateBrandingSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateBrandingSettingsDto,
  ): Promise<TenantBrandingSettingsPublic> {
    return this.siteSettings.updateBranding(tenantId, dto);
  }

  @Get('schedules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get temple hours and default seva slot interval' })
  getScheduleSettings(@TenantId() tenantId: string): Promise<TenantScheduleSettings> {
    return this.siteSettings.getScheduleSettings(tenantId);
  }

  @Patch('schedules')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update temple hours and slot interval' })
  updateScheduleSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateScheduleSettingsDto,
  ): Promise<TenantScheduleSettings> {
    return this.siteSettings.updateScheduleSettings(tenantId, dto);
  }

  @Get('catalog/services')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all seva services including inactive (admin)' })
  listSevaServices(@TenantId() tenantId: string): Promise<SevaService[]> {
    return this.sevaCatalog.findAllAdmin(tenantId);
  }

  @Post('catalog/services')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a seva / pooja catalog entry' })
  createSevaService(
    @TenantId() tenantId: string,
    @Body() dto: CreateSevaServiceSettingsDto,
  ): Promise<SevaService> {
    return this.sevaCatalog.create(tenantId, dto);
  }

  @Patch('catalog/services/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a seva catalog entry' })
  updateSevaService(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSevaServiceSettingsDto,
  ): Promise<SevaService> {
    return this.sevaCatalog.update(tenantId, id, dto);
  }

  @Get('catalog/products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all counter POS products including inactive (admin)' })
  listPosProducts(@TenantId() tenantId: string): Promise<PosProduct[]> {
    return this.posCatalog.findAllAdmin(tenantId);
  }

  @Post('catalog/products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a counter POS product' })
  createPosProduct(
    @TenantId() tenantId: string,
    @Body() dto: CreatePosProductSettingsDto,
  ): Promise<PosProduct> {
    return this.posCatalog.create(tenantId, dto);
  }

  @Patch('catalog/products/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a counter POS product' })
  updatePosProduct(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePosProductSettingsDto,
  ): Promise<PosProduct> {
    return this.posCatalog.update(tenantId, id, dto);
  }
}

@ApiTags('Branding')
@Controller('branding')
export class BrandingController {
  constructor(private readonly siteSettings: TenantSiteSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Resolved tenant branding (defaults + DB overrides)' })
  getBranding(@TenantId() tenantId: string): Promise<TenantBranding> {
    return this.siteSettings.getBranding(tenantId);
  }
}

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly posCatalog: PosCatalogService) {}

  @Get('products')
  @Roles(UserRole.ADMIN, UserRole.FRONT_DESK)
  @ApiOperation({ summary: 'Active counter POS products for checkout' })
  listActiveProducts(@TenantId() tenantId: string): Promise<PosProduct[]> {
    return this.posCatalog.findAllActive(tenantId);
  }
}

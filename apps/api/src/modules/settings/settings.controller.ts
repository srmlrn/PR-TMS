import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantPaymentSettingsPublic, UserRole } from '@tms/types';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { TenantPaymentSettingsService } from './tenant-payment-settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly paymentSettings: TenantPaymentSettingsService) {}

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
}

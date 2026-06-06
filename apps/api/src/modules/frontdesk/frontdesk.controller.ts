import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { IssueTokenDto } from './dto/issue-token.dto';
import { LookupQueryDto } from './dto/lookup-query.dto';
import {
  DevoteeLookupResponseDto,
  QueueStatsResponseDto,
  QueueTokenResponseDto,
} from './dto/frontdesk-response.dto';
import { FrontDeskService } from './frontdesk.service';

@ApiTags('Front Desk')
@Controller('frontdesk')
export class FrontDeskController {
  constructor(private readonly frontDeskService: FrontDeskService) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Look up a devotee by phone number' })
  @ApiOkResponse({ type: DevoteeLookupResponseDto })
  async lookup(
    @TenantId() tenantId: string,
    @Query() query: LookupQueryDto,
  ): Promise<DevoteeLookupResponseDto> {
    return this.frontDeskService.lookupDevotee(tenantId, query.phone);
  }

  @Post('tokens')
  @ApiOperation({ summary: 'Issue a darshan queue token' })
  @ApiCreatedResponse({ type: QueueTokenResponseDto })
  async issueToken(
    @TenantId() tenantId: string,
    @Body() dto: IssueTokenDto,
  ): Promise<QueueTokenResponseDto> {
    return this.frontDeskService.issueToken(tenantId, dto);
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Get current queue statistics' })
  @ApiOkResponse({ type: QueueStatsResponseDto })
  async getQueueStats(@TenantId() tenantId: string): Promise<QueueStatsResponseDto> {
    return this.frontDeskService.getQueueStats(tenantId);
  }
}

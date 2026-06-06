import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@tms/types';
import { TenantRequest } from '../middleware/tenant-context.middleware';

export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenantContext) {
      throw new Error('TenantContext missing on request');
    }
    return request.tenantContext;
  },
);

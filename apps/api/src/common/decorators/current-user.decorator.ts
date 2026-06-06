import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@tms/types';
import { TenantRequest } from '../middleware/tenant-context.middleware';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.user!;
  },
);

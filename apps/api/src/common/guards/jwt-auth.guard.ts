import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser, UserRole } from '@tms/types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenantRequest } from '../middleware/tenant-context.middleware';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const authUser = user as unknown as AuthUser;

    if (
      authUser.role !== UserRole.SUPER_ADMIN &&
      authUser.tenantId !== request.tenantId
    ) {
      throw new ForbiddenException('Tenant mismatch between token and request headers');
    }

    request.user = authUser;
    return user;
  }
}

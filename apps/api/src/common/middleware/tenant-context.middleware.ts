import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthUser, TenantContext, TenantEnvironment } from '@tms/types';
import { TenantResolverService } from '../../database/tenant-resolver.service';
import { TenantContextStorage } from '../context/tenant-context.storage';

export interface TenantRequest extends Request {
  tenantId: string;
  environment: TenantEnvironment;
  tenantContext: TenantContext;
  user?: AuthUser;
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const DEFAULT_ENV = TenantEnvironment.PROD;

function parseEnvironment(value: string | undefined): TenantEnvironment {
  const normalized = (value ?? DEFAULT_ENV).toLowerCase();
  if (Object.values(TenantEnvironment).includes(normalized as TenantEnvironment)) {
    return normalized as TenantEnvironment;
  }
  return DEFAULT_ENV;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    @Optional() private readonly tenantResolver?: TenantResolverService,
  ) {}

  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const tenantKey = (req.headers['x-tenant-id'] as string) ?? DEFAULT_TENANT;
    const environment = parseEnvironment(
      (req.headers['x-tenant-environment'] as string) ??
        (req.headers['x-environment'] as string),
    );

    if (process.env.STORAGE_MODE !== 'postgres') {
      req.tenantId = tenantKey;
      req.environment = environment;
      req.tenantContext = {
        tenantId: tenantKey,
        tenantSlug: 'sv-temple',
        environment,
        environmentId: `memory-${environment}`,
        dbName: `tms_sv_temple_${environment}`,
      };
      TenantContextStorage.run(req.tenantContext, () => next());
      return;
    }

    if (!this.tenantResolver) {
      next(new Error('TenantResolverService required when STORAGE_MODE=postgres'));
      return;
    }

    this.tenantResolver
      .resolve(tenantKey, environment)
      .then((ctx) => {
        req.tenantId = ctx.tenantId;
        req.environment = ctx.environment;
        req.tenantContext = ctx;
        TenantContextStorage.run(ctx, () => next());
      })
      .catch(next);
  }
}

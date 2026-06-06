import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from '@tms/types';

const storage = new AsyncLocalStorage<TenantContext>();

export class TenantContextStorage {
  static run<T>(ctx: TenantContext, fn: () => T): T {
    return storage.run(ctx, fn);
  }

  static get(): TenantContext {
    const ctx = storage.getStore();
    if (!ctx) {
      throw new Error('TenantContext not available — ensure TenantContextMiddleware is applied');
    }
    return ctx;
  }

  static tryGet(): TenantContext | undefined {
    return storage.getStore();
  }
}

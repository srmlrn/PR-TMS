import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnvironmentProvisionerService } from './environment-provisioner.service';

@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly provisioner: EnvironmentProvisionerService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.STORAGE_MODE === 'memory') {
      this.logger.log('STORAGE_MODE=memory — skipping tenant-env DB provisioning');
      return;
    }

    try {
      const count = await this.provisioner.provisionAllPending();
      await this.provisioner.ensureActiveEnvironmentsProvisioned();
      this.logger.log(`Tenant-environment databases ready (provisioned ${count} pending)`);
    } catch (err) {
      this.logger.warn(
        `Could not provision tenant DBs — is PostgreSQL running? (docker compose up -d). Error: ${(err as Error).message}`,
      );
    }
  }
}

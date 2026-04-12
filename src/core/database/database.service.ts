import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfigService } from '../app-config/app-config.service';
import { PrismaClient } from '../../../generated/prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  constructor(private readonly configService: AppConfigService) {
    if (!configService.DATABASE_URL.success) {
      throw new Error('Database URL not found');
    }
    const adapter = new PrismaPg({
      connectionString: configService.DATABASE_URL.data,
      application_name: configService.SERVICE_NAME.data!,
    });

    super({
      adapter,
      transactionOptions: {
        maxWait: 10000,
        timeout: 30000,
      },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

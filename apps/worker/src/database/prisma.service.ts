import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { configureNeonWebSocket } from './neon-ws';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }
    configureNeonWebSocket();
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Worker prisma connected (Neon WebSocket / 443)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

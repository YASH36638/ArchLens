import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { configureNeonWebSocket } from './neon-ws';

const retryLogger = new Logger('PrismaNeonRetry');

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

function isTransientNeonError(e: unknown): boolean {
  const msg = errorText(e);
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket disconnected|TLS connection|Connection terminated|WebSocket|fetch failed|network socket|Connection closed|Connect Timeout/i.test(
    msg
  );
}

async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isTransientNeonError(e) || attempt === maxAttempts) {
        throw e;
      }
      retryLogger.warn(`Transient Neon error (attempt ${attempt}/${maxAttempts}): ${errorText(e)}`);
      await new Promise((r) => setTimeout(r, 150 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  configureNeonWebSocket();

  // Keep idle WS short-lived — corporate proxies often reset long-lived Neon sockets.
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  });
  pool.on('error', (err) => {
    retryLogger.warn(`Neon pool idle client error: ${errorText(err)}`);
  });

  const adapter = new PrismaNeon(pool);
  const client = new PrismaClient({ adapter }).$extends({
    query: {
      $allOperations({ args, query }) {
        return withTransientRetry(() => query(args));
      },
    },
  });

  return Object.assign(client, { __neonPool: pool });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const PrismaClientConstructor = class {
  constructor() {
    return createPrismaClient();
  }
} as new () => ExtendedPrismaClient;

@Injectable()
export class PrismaService
  extends PrismaClientConstructor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected (Neon WebSocket / 443, transient retry enabled)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    const pool = (this as ExtendedPrismaClient).__neonPool;
    if (pool) {
      await pool.end().catch(() => undefined);
    }
  }
}

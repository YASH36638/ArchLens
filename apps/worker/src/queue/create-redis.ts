import IORedis, { type RedisOptions } from 'ioredis';

/** See apps/api/src/queue/create-redis.ts */
export function createRedis(url: string, overrides: RedisOptions = {}): IORedis {
  const insecure = process.env.ARCHLENS_TLS_INSECURE !== '0';
  const needsTlsRelax = insecure && url.startsWith('rediss://');

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    ...(needsTlsRelax ? { tls: { rejectUnauthorized: false } } : {}),
    ...overrides,
  });
}

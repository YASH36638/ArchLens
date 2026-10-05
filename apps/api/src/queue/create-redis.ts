import IORedis, { type RedisOptions } from 'ioredis';

/**
 * Create an ioredis client. When ARCHLENS_TLS_INSECURE !== '0' and the URL
 * uses rediss://, skip TLS cert verification (corporate MITM / CrowdStrike).
 */
export function createRedis(url: string, overrides: RedisOptions = {}): IORedis {
  const insecure = process.env.ARCHLENS_TLS_INSECURE !== '0';
  const needsTlsRelax = insecure && url.startsWith('rediss://');

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    ...(needsTlsRelax ? { tls: { rejectUnauthorized: false } } : {}),
    ...overrides,
  });
}

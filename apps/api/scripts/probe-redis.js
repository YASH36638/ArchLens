const IORedis = require('ioredis');

const url =
  'rediss://default:gQAAAAAAAdYDAAIgcDFlOTdhMmFlYTRkZjk0MWI0YWVjODIyNjIyZDZjZTMxZQ@pleasant-reptile-120323.upstash.io:6379';

const r = new IORedis(url, {
  maxRetriesPerRequest: 1,
  connectTimeout: 10000,
  commandTimeout: 10000,
  tls: { rejectUnauthorized: false },
  lazyConnect: true,
  retryStrategy: () => null,
});

(async () => {
  try {
    await r.connect();
    console.log('PING', await r.ping());
    await r.quit();
  } catch (e) {
    console.error('FAIL', e.message);
    process.exitCode = 1;
    try {
      r.disconnect();
    } catch {
      /* ignore */
    }
  }
})();

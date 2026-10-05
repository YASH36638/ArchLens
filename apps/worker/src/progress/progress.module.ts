import { Global, Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';
import type { WorkerConfig } from '../config/configuration';
import { createRedis } from '../queue/create-redis';
import { ProgressPublisher, REDIS_PUB_TOKEN } from './progress.publisher';

const redisProvider: Provider = {
  provide: REDIS_PUB_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService<WorkerConfig, true>): IORedis => {
    const url = config.get('REDIS_URL', { infer: true });
    return createRedis(url);
  },
};

@Global()
@Module({
  providers: [redisProvider, ProgressPublisher],
  exports: [ProgressPublisher, REDIS_PUB_TOKEN],
})
export class ProgressModule {}

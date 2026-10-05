import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config/config.types';

// Force apps/api/.env over inherited shell env (Cursor/IDE often sets PORT=8000).
loadDotenv({ path: resolve(__dirname, '../.env'), override: true });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('PORT', { infer: true });
  const webUrl = config.get('WEB_APP_URL', { infer: true });

  app.enableCors({
    origin: webUrl ?? true,
    credentials: true,
  });

  await app.listen(port);
  new Logger('Bootstrap').log(`Archlens API listening on http://localhost:${port}`);
}

void bootstrap();

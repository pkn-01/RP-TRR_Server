import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* ================= CORS ================= */
  const corsOrigin =
    process.env.CORS_ORIGIN || 'https://rp-trr-server-mbyi.vercel.app';

  const origins = corsOrigin.split(',').map((o) => o.trim());

  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  /* ================= Body Parser ================= */
  app.use(
    json({
      limit: '20mb',
      type: (req: any): boolean => {
        const contentType = (req.headers['content-type'] as string) || '';
        return (
          contentType.includes('application/json') &&
          !contentType.includes('multipart/form-data')
        );
      },
    }),
  );

  app.use(
    urlencoded({
      limit: '20mb',
      extended: true,
      type: (req: any): boolean => {
        const contentType = (req.headers['content-type'] as string) || '';
        return (
          contentType.includes('application/x-www-form-urlencoded') &&
          !contentType.includes('multipart/form-data')
        );
      },
    }),
  );

  /* ================= Validation ================= */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      skipMissingProperties: true,
    }),
  );

  /* ================= Listen ================= */
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  // Optional: schedule cleanup job for old uploads
  const enableCleanup = process.env.ENABLE_CLEANUP === 'true';
  const retentionDays = Number(process.env.UPLOAD_RETENTION_DAYS || 30);
  if (enableCleanup) {
    const storage = app.get(StorageService);
    // run cleanup immediately and then once a day
    storage.cleanupOldFiles(retentionDays).catch((e) => console.warn('Cleanup error', e));
    setInterval(() => storage.cleanupOldFiles(retentionDays).catch((e) => console.warn('Cleanup error', e)), 24 * 60 * 60 * 1000);
  }

  console.log(`🚀 Server running on http://localhost:${port}`);
}

void bootstrap();
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* ================= CORS ================= */
  const corsOrigin =
    process.env.CORS_ORIGIN || 'https://rp-trr-server-mbyi.vercel.app';

  const origins = corsOrigin.split(',').map(o => o.trim());

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
      type: (req: any) => {
        const contentType = req.headers['content-type'] || '';
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
      type: (req: any) => {
        const contentType = req.headers['content-type'] || '';
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

  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();

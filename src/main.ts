import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded, raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Enable CORS so frontend (Next.js) can call this API
  const corsOrigin = process.env.CORS_ORIGIN || 'https://rp-trr-server-mbyi.vercel.app/;
  const origins = corsOrigin.split(',').map(origin => origin.trim());
  
  app.enableCors({
    origin: origins.length > 1 ? origins : origins[0],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  })

  // Configure body size limit to 20MB for file uploads
  // For JSON requests
  app.use(json({ limit: '20mb' }));
  // For URL-encoded requests
  app.use(urlencoded({ limit: '20mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
    }),
  );;
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();

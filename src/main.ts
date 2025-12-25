import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Enable CORS so frontend (Next.js) can call this API
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const origins = corsOrigin.split(',').map(origin => origin.trim());
  
  app.enableCors({
    origin: origins.length > 1 ? origins : origins[0],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  })

  // Configure body size limit to 20MB for file uploads
  // Skip JSON parsing for multipart routes to allow file uploads
  app.use(json({ limit: '20mb', skip: (req) => {
    return req.is('multipart/form-data');
  } }));
  app.use(urlencoded({ limit: '20mb', extended: true, skip: (req) => {
    return req.is('multipart/form-data');
  } }));

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

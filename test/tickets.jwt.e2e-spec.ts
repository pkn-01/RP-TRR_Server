import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { JwtService } from '@nestjs/jwt';

describe('Tickets JWT e2e', () => {
  let app: INestApplication;

  const mockPrisma = {
    ticket: { create: jest.fn().mockResolvedValue({ id: 123, title: 't', ticketCode: 'T-123' }) },
    attachment: { createMany: jest.fn().mockResolvedValue({}) },
    lineOALink: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    user: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  } as any;

  const mockStorage = { uploadBuffer: jest.fn().mockResolvedValue({ url: '/uploads/test.png', key: 'test.png' }) } as any;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(StorageService)
      .useValue(mockStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/tickets with JWT should succeed', async () => {
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ sub: 1, role: 'USER' });

    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'E2E Title')
      .field('description', 'E2E Desc')
      .field('equipmentName', 'E2E PC')
      .attach('files', Buffer.from('ok'), { filename: 'e2e.png', contentType: 'image/png' })
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
      });
  });
});

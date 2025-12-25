import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';
import { JwtAuthGuard } from '../src/auth/jwt.guard';

describe('Tickets (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    ticket: {
      create: jest.fn().mockResolvedValue({ id: 1, title: 't', ticketCode: 'T-1' }),
    },
    attachment: {
      createMany: jest.fn().mockResolvedValue({}),
    },
    user: {
      create: jest.fn().mockResolvedValue({ id: 2 }),
    },
    lineOALink: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;

  const mockStorage = {
    uploadBuffer: jest.fn().mockResolvedValue({ url: '/uploads/test.png', key: 'test.png' }),
    cleanupOldFiles: jest.fn(),
    getSignedUrl: jest.fn().mockResolvedValue('/uploads/test.png'),
  } as any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(StorageService)
      .useValue(mockStorage)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        req.user = { id: 1, role: 'USER' };
        return true;
      }})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/tickets (POST) uploads file and creates ticket', async () => {
    await request(app.getHttpServer())
      .post('/api/tickets')
      .set('authorization', 'Bearer faketoken')
      .field('title', 'Test')
      .field('description', 'desc')
      .field('equipmentName', 'PC')
      .attach('files', Buffer.from('hello'), { filename: 'test.png', contentType: 'image/png' })
      .expect(201);
  });
});

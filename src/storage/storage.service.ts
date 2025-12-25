import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private provider = process.env.STORAGE_PROVIDER || 'local';
  private bucket = process.env.S3_BUCKET || '';
  private client: any = null;

  constructor() {}

  private ensureUploadsDir(): string {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
  }

  private async ensureS3Client() {
    if (this.client) return this.client;
    // dynamic import to avoid hard dependency at build time
    const { S3Client } = await import('@aws-sdk/client-s3');
    const region = process.env.S3_REGION;
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
    const endpoint = process.env.S3_ENDPOINT;
    const s3 = new S3Client({ region, credentials, endpoint, forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE });
    this.client = s3;
    return this.client;
  }

  async uploadBuffer(key: string, buffer: Buffer, mimeType?: string): Promise<{ url: string; key: string }> {
    if (this.provider === 's3') {
      try {
        const s3 = await this.ensureS3Client();
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const params = {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        };
        await s3.send(new PutObjectCommand(params));
        const url = process.env.S3_PUBLIC_URL ? `${process.env.S3_PUBLIC_URL}/${key}` : `s3://${this.bucket}/${key}`;
        return { url, key };
      } catch (e) {
        this.logger.warn('S3 upload failed, falling back to local', e?.message || e);
      }
    }

    // local fallback
    const uploadsDir = this.ensureUploadsDir();
    const filePath = path.join(uploadsDir, key);
    fs.writeFileSync(filePath, buffer);
    return { url: `/uploads/${key}`, key };
  }

  async deleteObject(key: string) {
    if (this.provider === 's3') {
      try {
        const s3 = await this.ensureS3Client();
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        return true;
      } catch (e) {
        this.logger.warn('S3 delete failed', e?.message || e);
        return false;
      }
    }

    const uploadsDir = this.ensureUploadsDir();
    const filePath = path.join(uploadsDir, key);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    } catch (e) {
      this.logger.warn('Local delete failed', e?.message || e);
      return false;
    }
  }

  async getSignedUrl(key: string, expiresSeconds = 3600): Promise<string> {
    if (this.provider === 's3') {
      try {
        const s3 = await this.ensureS3Client();
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
      } catch (e) {
        this.logger.warn('Generating signed URL failed', e?.message || e);
      }
    }
    // local: return direct path (assuming server serves uploads/ statically)
    return `/uploads/${key}`;
  }

  async cleanupOldFiles(days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    if (this.provider === 's3') {
      try {
        const s3 = await this.ensureS3Client();
        const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
        const list = await s3.send(new ListObjectsV2Command({ Bucket: this.bucket }));
        const toDelete = (list.Contents || []).filter((o: any) => (o.LastModified ? new Date(o.LastModified).getTime() < cutoff : false));
        if (toDelete.length > 0) {
          const Delete = toDelete.map((o: any) => ({ Key: o.Key }));
          await s3.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: Delete } }));
        }
      } catch (e) {
        this.logger.warn('S3 cleanup failed', e?.message || e);
      }
      return;
    }

    // local cleanup
    const uploadsDir = this.ensureUploadsDir();
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(uploadsDir, f));
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(path.join(uploadsDir, f));
        }
      } catch (e) {
        this.logger.warn('Cleanup failed for file', f, e?.message || e);
      }
    }
  }
}

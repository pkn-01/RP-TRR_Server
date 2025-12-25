require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION;
const accessKey = process.env.S3_ACCESS_KEY_ID;
const secretKey = process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.S3_ENDPOINT;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

if (!bucket || !accessKey || !secretKey) {
  console.log('S3 env vars not set. Skipping S3 test. Populate .env or set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY to run the test.');
  process.exit(0);
}

(async () => {
  try {
    const s3 = new S3Client({ region, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }, endpoint, forcePathStyle });
    const key = `test-upload-${Date.now()}.txt`;
    const body = 'hello from s3 test';
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain' });
    await s3.send(cmd);
    console.log('S3 upload succeeded for key:', key);
  } catch (e) {
    console.error('S3 upload failed:', e?.message || e);
    process.exitCode = 2;
  }
})();

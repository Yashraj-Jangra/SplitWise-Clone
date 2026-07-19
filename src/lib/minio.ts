import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
  region: 'us-east-1',          // MinIO ignores region but SDK requires a value
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minio_admin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minio_admin_secret',
  },
  forcePathStyle: true,          // Required for MinIO
});

export const BUCKET = process.env.MINIO_BUCKET || 'splitwise';

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));

  // Returns relative proxy path so we don't expose MinIO ports/domains publicly
  return `/api/storage/${key}`;
}

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Oracle Cloud Infrastructure (OCI) Object Storage Client
 * Configured using OCI's S3 Compatibility API endpoint.
 */
const region = process.env.OCI_REGION || 'ap-mumbai-1';
const namespace = process.env.OCI_NAMESPACE || 'splitit';

export const s3 = new S3Client({
  endpoint: process.env.OCI_STORAGE_ENDPOINT || `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`,
  region: region,
  credentials: {
    accessKeyId: process.env.OCI_S3_ACCESS_KEY || '',
    secretAccessKey: process.env.OCI_S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.OCI_STORAGE_BUCKET || 'splitit-storage';

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return `/api/storage/${key}`;
}

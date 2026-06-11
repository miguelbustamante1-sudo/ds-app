import { Storage } from '@google-cloud/storage';
import { AppError } from '../../errors/AppError';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
if (!BUCKET_NAME) throw new Error('GCS_BUCKET_NAME env var is not set');

const storage = new Storage();
const bucket = storage.bucket(BUCKET_NAME);

export async function uploadToGCS(
  buffer: Buffer,
  objectName: string,
  mimeType: string,
): Promise<void> {
  const file = bucket.file(objectName);
  await file.save(buffer, { contentType: mimeType, resumable: false });
}

export async function getSignedUrl(objectName: string): Promise<string> {
  const file = bucket.file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new AppError('File not found in storage', 404);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

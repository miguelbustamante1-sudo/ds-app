import { Storage } from '@google-cloud/storage';
import { AppError } from '../../errors/AppError';
import fs from 'fs';
import path from 'path';

// When LOCAL_FILE_STORAGE=true in .env.local, files are saved to disk instead
// of GCS. This allows the upload flow to work in local development without
// a real GCS bucket.
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');

let bucket: ReturnType<Storage['bucket']> | undefined;

function resolveBucket(): ReturnType<Storage['bucket']> {
  if (bucket) return bucket;
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new AppError('GCS_BUCKET_NAME env var is not set', 500);
  const storage = new Storage();
  bucket = storage.bucket(bucketName);
  return bucket;
}

export async function uploadToGCS(
  buffer: Buffer,
  objectName: string,
  mimeType: string,
): Promise<void> {
  if (process.env.LOCAL_FILE_STORAGE === 'true') {
    const dest = path.join(LOCAL_UPLOADS_DIR, objectName);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, buffer);
    return;
  }
  const file = resolveBucket().file(objectName);
  await file.save(buffer, { contentType: mimeType, resumable: false });
}

export async function getSignedUrl(objectName: string): Promise<string> {
  if (process.env.LOCAL_FILE_STORAGE === 'true') {
    return `/local-uploads/${objectName}`;
  }
  const file = resolveBucket().file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new AppError('File not found in storage', 404);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

export async function downloadFromGCS(objectName: string): Promise<Buffer> {
  if (process.env.LOCAL_FILE_STORAGE === 'true') {
    const src = path.join(LOCAL_UPLOADS_DIR, objectName);
    try {
      return await fs.promises.readFile(src);
    } catch {
      throw new AppError(`File not found in local storage: ${objectName}`, 404);
    }
  }
  const file = resolveBucket().file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new AppError(`File not found in storage: ${objectName}`, 404);
  const [buffer] = await file.download();
  return buffer;
}

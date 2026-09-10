import { randomBytes } from 'crypto';
import path from 'path';
import { prisma } from '../../db/prisma';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import { uploadToGCS, getSignedUrl } from './gcsClient';

export interface CreateUploadInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  createdBy: number;
  userEmail: string;
}

export interface UploadDTO {
  uploadId: number;
  uploadOriginalName: string;
  uploadMimeType: string;
  uploadSizeBytes: number;
  uploadStorageKey: string;
  uploadCreatedDate: Date;
}

export async function createUpload(input: CreateUploadInput): Promise<UploadDTO> {
  const ext = path.extname(input.originalName);
  const objectName = `uploads/${randomBytes(16).toString('hex')}${ext}`;

  await uploadToGCS(input.buffer, objectName, input.mimeType);

  const select = {
    uploadId: true,
    uploadOriginalName: true,
    uploadMimeType: true,
    uploadSizeBytes: true,
    uploadStorageKey: true,
    uploadCreatedDate: true,
  } as const;

  const upload = await prisma.upload.create({
    data: {
      uploadOriginalName: input.originalName,
      uploadMimeType: input.mimeType,
      uploadSizeBytes: input.sizeBytes,
      uploadStorageKey: objectName,
      uploadCreatedBy: input.createdBy,
    },
    select,
  });

  await auditOrchestrator.log({
    entityName: 'upl_uploads',
    entityId: String(upload.uploadId),
    createdBy: input.userEmail,
    oldValues: null,
    newValues: upload as unknown as Record<string, unknown>,
    comment: `File uploaded: ${input.originalName}`,
  });

  return upload;
}

export async function findUploadById(uploadId: number): Promise<UploadDTO> {
  const upload = await prisma.upload.findUnique({
    where: { uploadId },
    select: {
      uploadId: true,
      uploadOriginalName: true,
      uploadMimeType: true,
      uploadSizeBytes: true,
      uploadStorageKey: true,
      uploadCreatedDate: true,
    },
  });
  if (!upload) throw new AppError('Upload not found', 404);
  return upload;
}

export { getSignedUrl };

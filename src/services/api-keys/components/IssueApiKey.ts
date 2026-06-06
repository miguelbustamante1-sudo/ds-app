import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../../db/prisma';
import type { IssueApiKeyDTO, IssueApiKeyResponseDTO } from '@shared/dto';
import { AppError } from '../../../errors/AppError';

const BCRYPT_COST = 10;

export async function issueApiKey(
  input: IssueApiKeyDTO,
  createdBy: number,
): Promise<IssueApiKeyResponseDTO> {
  if (!input.apkName?.trim()) {
    throw new AppError('Key name is required', 400);
  }

  const rawKey = crypto.randomBytes(32).toString('hex');
  const apkKeyHash = await bcrypt.hash(rawKey, BCRYPT_COST);

  const created = await prisma.apiKey.create({
    data: {
      apkName: input.apkName.trim(),
      apkKeyHash,
      apkIsActive: true,
      apkCreatedBy: createdBy,
    },
    select: { apkId: true, apkName: true },
  });

  return {
    apkId: created.apkId,
    apkName: created.apkName,
    rawKey,
  };
}

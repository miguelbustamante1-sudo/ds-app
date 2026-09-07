import type { MondayConnection } from '@prisma/client';
import type { MondayConnectionDTO, MondayFieldMapping, MondaySyncSummary, MondaySyncStatus } from '@shared/dto';
import { decryptSecret, maskSecret } from '../lib/secretCipher';

export function mapConnectionToDto(row: MondayConnection): MondayConnectionDTO {
  const rawKey = decryptSecret(row.mcdApiKeyEncrypted);

  return {
    mcdId: row.mcdId,
    mcdName: row.mcdName,
    mcdApiKeyMasked: maskSecret(rawKey),
    mcdBoardId: row.mcdBoardId,
    mcdBoardName: row.mcdBoardName,
    mcdFieldMapping: row.mcdFieldMapping as MondayFieldMapping,
    mcdIsActive: row.mcdIsActive,
    mcdLastSyncedDate: row.mcdLastSyncedDate ? row.mcdLastSyncedDate.toISOString() : null,
    mcdLastSyncStatus: row.mcdLastSyncStatus as MondaySyncStatus | null,
    mcdLastSyncSummary: row.mcdLastSyncSummary as MondaySyncSummary | null,
    createdBy: row.mcdCreatedBy,
    createdDate: row.mcdCreatedDate.toISOString(),
    updatedBy: row.mcdUpdatedBy,
    updatedDate: row.mcdUpdatedDate ? row.mcdUpdatedDate.toISOString() : null,
  };
}

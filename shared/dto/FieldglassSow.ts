/**
 * DTOs for FieldglassSow entity (ds.fgs_fieldglass_sows)
 */

export interface FieldglassSowDTO {
  fgsId: number;
  sowName: string | null;
  sowId: string | null;
  sowOwner: string | null;
  backupSowOwner: string | null;
  tdxSowCreatorsPrimary: string | null;
  tdxSowCreatorsDelegate: string | null;
  tdxTaPrimePrimary: string | null;
  tdxTaPrimeDelegate: string | null;
  tdxProfileWorkerCreatorsPrimary: string | null;
  tdxProfileWorkerCreatorsDelegate: string | null;
  createdBy: number;
  createdAt: string;
  lastUpdatedBy: number | null;
  lastUpdatedAt: string | null;
}

export interface CreateFieldglassSowDTO {
  sowName?: string | null;
  sowId?: string | null;
  sowOwner?: string | null;
  backupSowOwner?: string | null;
  tdxSowCreatorsPrimary?: string | null;
  tdxSowCreatorsDelegate?: string | null;
  tdxTaPrimePrimary?: string | null;
  tdxTaPrimeDelegate?: string | null;
  tdxProfileWorkerCreatorsPrimary?: string | null;
  tdxProfileWorkerCreatorsDelegate?: string | null;
}

export interface UpdateFieldglassSowDTO {
  sowName?: string | null;
  sowId?: string | null;
  sowOwner?: string | null;
  backupSowOwner?: string | null;
  tdxSowCreatorsPrimary?: string | null;
  tdxSowCreatorsDelegate?: string | null;
  tdxTaPrimePrimary?: string | null;
  tdxTaPrimeDelegate?: string | null;
  tdxProfileWorkerCreatorsPrimary?: string | null;
  tdxProfileWorkerCreatorsDelegate?: string | null;
}

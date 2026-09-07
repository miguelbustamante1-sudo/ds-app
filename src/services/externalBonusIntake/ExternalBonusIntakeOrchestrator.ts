import { validateBonusEntries } from './components/ValidateBonusEntries';
import { insertBonusExternalEntries } from './components/InsertBonusExternalEntries';
import type { BonusExternalEntryDTO, SubmitBonusExternalEntriesResponseDTO } from '@shared/dto';

// es.bxi_bonus_external_intake is exempt from audit logging (es-schema
// exemption, Governance/05) — no auditOrchestrator.log call here is intentional.
async function orchestrateSubmitEntries(
  entries: BonusExternalEntryDTO[],
  createdByApiKeyId: number,
): Promise<SubmitBonusExternalEntriesResponseDTO> {
  validateBonusEntries(entries);
  const inserted = await insertBonusExternalEntries(entries, createdByApiKeyId);
  return { inserted };
}

export const externalBonusIntakeOrchestrator = {
  submitEntries: orchestrateSubmitEntries,
};

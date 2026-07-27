import type { CreateEndorsementWithBonusesDTO, UpdateEndorsementDTO } from '@shared/dto';
import type { Endorsement } from '@prisma/client';
import { validateRequiredFields, type ValidationError } from './components/ValidateRequiredFields';
import { validateEmailFormat } from './components/ValidateEmailFormat';
import { validateBonusArray } from './components/ValidateBonusArray';
import { validateBonusMetadata } from './components/ValidateBonusMetadata';
import { createEndorsement, createEndorsementWithBonuses, updateEndorsement, getEndorsementById, TABLE } from '../../db/endorsements';
import { getBonusSubcategoryById } from '../../db/bonusSubcategories';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { jobProfileOrchestrator } from '../jobProfile/JobProfileOrchestrator';

/**
 * Derives the job profile (FR-003) when position, tier/band, skill, and group are all set.
 * Returns null gracefully when any input is missing or no mapping row exists yet (TASK-001).
 */
async function resolveJobProfileId(
  posId: number,
  tibId: number | null | undefined,
  sklId: number | null | undefined,
  grpId: number | null | undefined,
): Promise<number | null> {
  if (!tibId || !sklId || !grpId) return null;
  const derived = await jobProfileOrchestrator.deriveJobProfile(posId, tibId, sklId, grpId);
  return derived.jobProfileId;
}

interface OrchestratorResult {
  success: boolean;
  data?: Endorsement;
  errors?: ValidationError[];
}

export async function orchestrateCreateEndorsement(
  input: CreateEndorsementWithBonusesDTO,
  createdBy: string,
): Promise<OrchestratorResult> {
  const allErrors: ValidationError[] = [];

  // Step 1: Validate required fields
  const requiredErrors = validateRequiredFields(input);
  if (requiredErrors.length > 0) {
    return { success: false, errors: requiredErrors };
  }

  // Step 2: Validate email format
  const emailErrors = validateEmailFormat(input.clientManagerEmail);
  if (emailErrors.length > 0) {
    return { success: false, errors: emailErrors };
  }

  // Step 3: Validate bonuses array structure
  const bonuses = input.bonuses ?? [];
  if (bonuses.length > 0) {
    const bonusArrayErrors = validateBonusArray(bonuses);
    allErrors.push(...bonusArrayErrors);

    // Step 4: Validate each bonus against its subcategory
    const sanitizedBonuses: Array<{
      bonusSubcategoryId: number;
      endorsementBonusAmount: number | null;
      endorsementBonusComments: string | null;
      endorsementBonusMetadata: Record<string, unknown>;
      endorsementBonusCreatedBy: string;
    }> = [];

    for (let i = 0; i < bonuses.length; i++) {
      const bonus = bonuses[i]!;
      const subcategory = await getBonusSubcategoryById(bonus.bonusSubcategoryId);

      if (!subcategory) {
        allErrors.push({
          field: `bonuses[${i}].bonusSubcategoryId`,
          message: `Bonus subcategory ${bonus.bonusSubcategoryId} not found`,
        });
        continue;
      }

      // Verify country match
      if (subcategory.countryId !== input.countryId) {
        allErrors.push({
          field: `bonuses[${i}].bonusSubcategoryId`,
          message: `Bonus subcategory ${bonus.bonusSubcategoryId} does not match endorsement country`,
        });
        continue;
      }

      // Validate and sanitize metadata
      const schema = (subcategory.bonusSubcategoryMetadata ?? {}) as Record<string, string>;
      const { errors: metadataErrors, sanitized } = validateBonusMetadata(
        bonus.endorsementBonusMetadata ?? {},
        schema,
      );

      for (const err of metadataErrors) {
        allErrors.push({
          field: `bonuses[${i}].endorsementBonusMetadata.${err.field}`,
          message: err.message,
        });
      }

      sanitizedBonuses.push({
        bonusSubcategoryId: bonus.bonusSubcategoryId,
        endorsementBonusAmount: bonus.endorsementBonusAmount,
        endorsementBonusComments: bonus.endorsementBonusComments?.trim() || null,
        endorsementBonusMetadata: sanitized,
        endorsementBonusCreatedBy: createdBy,
      });
    }

    // Return all collected errors before any DB write
    if (allErrors.length > 0) {
      return { success: false, errors: allErrors };
    }

    // Step 5: Create endorsement with bonuses in a transaction
    const jbpId = await resolveJobProfileId(input.posId, input.tibId, input.sklId, input.grpId);
    const endorsement = await createEndorsementWithBonuses(
      {
        candidateFirstName: input.candidateFirstName.trim(),
        candidateLastName: input.candidateLastName.trim(),
        posId: input.posId,
        projectId: input.projectId,
        clientManagerEmail: input.clientManagerEmail.trim(),
        tibId: input.tibId ?? null,
        billingRate: input.billingRate ?? null,
        billingRateCurrency: input.billingRateCurrency ?? null,
        countryId: input.countryId,
        startDate: new Date(input.startDate),
        status: 'Pending',
        createdBy,
        comment: input.comment?.trim() || null,
        sklId: input.sklId ?? null,
        grpId: input.grpId ?? null,
        jbpId,
      },
      sanitizedBonuses,
    );

    await auditOrchestrator.log({
      entityName: TABLE,
      entityId: String(endorsement!.endorsementId),
      createdBy,
      oldValues: null,
      newValues: endorsement as unknown as Record<string, unknown>,
    });

    return { success: true, data: endorsement! };
  }

  // No bonuses — return all errors if any
  if (allErrors.length > 0) {
    return { success: false, errors: allErrors };
  }

  // No bonuses — create endorsement only
  const jbpId = await resolveJobProfileId(input.posId, input.tibId, input.sklId, input.grpId);
  const endorsement = await createEndorsement({
    candidateFirstName: input.candidateFirstName.trim(),
    candidateLastName: input.candidateLastName.trim(),
    posId: input.posId,
    projectId: input.projectId,
    clientManagerEmail: input.clientManagerEmail.trim(),
    tibId: input.tibId ?? null,
    billingRate: input.billingRate ?? null,
    billingRateCurrency: input.billingRateCurrency ?? null,
    countryId: input.countryId,
    startDate: new Date(input.startDate),
    status: 'Pending',
    createdBy,
    comment: input.comment?.trim() || null,
    sklId: input.sklId ?? null,
    grpId: input.grpId ?? null,
    jbpId,
  });

  await auditOrchestrator.log({
    entityName: TABLE,
    entityId: String(endorsement.endorsementId),
    createdBy,
    oldValues: null,
    newValues: endorsement as unknown as Record<string, unknown>,
  });

  return { success: true, data: endorsement };
}

export async function orchestrateUpdateEndorsement(
  id: number,
  input: UpdateEndorsementDTO,
  updatedBy: string,
): Promise<OrchestratorResult> {
  // Step 1: Verify endorsement exists
  const existing = await getEndorsementById(id);
  if (!existing) {
    return { success: false, errors: [{ field: 'endorsementId', message: 'Endorsement not found' }] };
  }

  // Step 2: Validate email format if provided
  if (input.clientManagerEmail) {
    const emailErrors = validateEmailFormat(input.clientManagerEmail);
    if (emailErrors.length > 0) {
      return { success: false, errors: emailErrors };
    }
  }

  // Step 3: Build update data
  const updateData: Record<string, unknown> = { updatedBy };

  if (input.candidateFirstName !== undefined) updateData.candidateFirstName = input.candidateFirstName.trim();
  if (input.candidateLastName !== undefined) updateData.candidateLastName = input.candidateLastName.trim();
  if (input.posId !== undefined) updateData.posId = input.posId;
  if (input.projectId !== undefined) updateData.projectId = input.projectId;
  if (input.clientManagerEmail !== undefined) updateData.clientManagerEmail = input.clientManagerEmail.trim();
  if (input.tibId !== undefined) updateData.tibId = input.tibId;
  if (input.billingRate !== undefined) updateData.billingRate = input.billingRate;
  if (input.billingRateCurrency !== undefined) updateData.billingRateCurrency = input.billingRateCurrency;
  if (input.countryId !== undefined) updateData.countryId = input.countryId;
  if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
  if (input.sklId !== undefined) updateData.sklId = input.sklId;
  if (input.grpId !== undefined) updateData.grpId = input.grpId;
  if (input.comment !== undefined) updateData.comment = input.comment?.trim() || null;

  // Re-derive job profile (FR-003) whenever any of its four inputs change
  if (input.posId !== undefined || input.tibId !== undefined || input.sklId !== undefined || input.grpId !== undefined) {
    const posId = input.posId ?? existing.posId;
    const tibId = input.tibId !== undefined ? input.tibId : existing.tibId;
    const sklId = input.sklId !== undefined ? input.sklId : existing.sklId;
    const grpId = input.grpId !== undefined ? input.grpId : existing.grpId;
    updateData.jbpId = await resolveJobProfileId(posId, tibId, sklId, grpId);
  }

  const updated = await updateEndorsement(id, updateData);

  await auditOrchestrator.log({
    entityName: TABLE,
    entityId: String(id),
    createdBy: updatedBy,
    oldValues: existing as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
  });

  return { success: true, data: updated };
}

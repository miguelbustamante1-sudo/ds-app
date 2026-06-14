import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';

export async function createOrUpdateDecision(
  cycId: number,
  winnerId: number,
  justification: string,
  createdBy: number,
  userEmail: string
): Promise<void> {
  if (justification.trim().length < 100) {
    throw new AppError('Justification must be at least 100 characters', 400);
  }

  const existing = await prisma.tpCommitteeDecision.findUnique({ where: { cycId } });

  if (existing) {
    if (existing.decConfirmedAt) {
      throw new AppError('This decision is already confirmed and cannot be changed', 409);
    }
    const updated = await prisma.tpCommitteeDecision.update({
      where: { cycId },
      data: { decWinnerId: winnerId, decJustification: justification },
    });
    await auditOrchestrator.log({
      entityName: 'dec_decisions',
      entityId: String(updated.decId),
      createdBy: userEmail,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'Committee decision updated',
    });
  } else {
    const created = await prisma.tpCommitteeDecision.create({
      data: {
        cycId,
        decWinnerId: winnerId,
        decJustification: justification,
        decCreatedBy: createdBy,
      },
    });
    await auditOrchestrator.log({
      entityName: 'dec_decisions',
      entityId: String(created.decId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: 'Committee decision created',
    });
  }
}

export async function confirmDecision(cycId: number, confirmingUserId: number, userEmail: string): Promise<void> {
  const decision = await prisma.tpCommitteeDecision.findUnique({ where: { cycId } });
  if (!decision) throw new AppError('No decision found for this cycle', 404);
  if (decision.decConfirmedAt) throw new AppError('Already confirmed', 409);

  const before = { ...decision };
  let updated: typeof decision;

  if (!decision.decConfirmedBy1) {
    updated = await prisma.tpCommitteeDecision.update({
      where: { cycId },
      data: { decConfirmedBy1: confirmingUserId },
    });
  } else if (!decision.decConfirmedBy2) {
    if (decision.decConfirmedBy1 === confirmingUserId) {
      throw new AppError('The same person cannot confirm twice', 409);
    }
    updated = await prisma.tpCommitteeDecision.update({
      where: { cycId },
      data: {
        decConfirmedBy2: confirmingUserId,
        decConfirmedAt: new Date(),
      },
    });
  } else {
    throw new AppError('Decision already has two confirmations', 409);
  }

  if (updated.decConfirmedAt) {
    const cycleBefore = await prisma.tpCycle.findUnique({ where: { cycId } });
    const cycleUpdated = await prisma.tpCycle.update({
      where: { cycId },
      data: { cycStatus: 'RESULTS_PUBLISHED', cycUpdatedBy: confirmingUserId, cycUpdatedDate: new Date() },
    });
    await auditOrchestrator.log({
      entityName: 'cyc_cycles',
      entityId: String(cycId),
      createdBy: userEmail,
      oldValues: cycleBefore as unknown as Record<string, unknown>,
      newValues: cycleUpdated as unknown as Record<string, unknown>,
      comment: 'Cycle status set to RESULTS_PUBLISHED after dual confirmation',
    });
  }

  await auditOrchestrator.log({
    entityName: 'dec_decisions',
    entityId: String(updated.decId),
    createdBy: userEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: updated as unknown as Record<string, unknown>,
    comment: updated.decConfirmedAt
      ? 'Committee decision fully confirmed — results frozen'
      : 'Committee decision: first confirmation recorded',
  });
}

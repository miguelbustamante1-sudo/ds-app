/**
 * AdjustWorkdayBalance
 * Deducts or restores vacation / personal day balance in es.win_workday_info
 * and writes an audit record for every successful mutation.
 *
 * Positive days  = deduct  (create, edit with more days)
 * Negative days  = restore (cancel, edit with fewer days)
 * Zero days      = no-op
 */

import { prisma } from '../../../db/prisma';
import { getWorkdayInfoById, updateWorkdayInfo } from '../../../db/workdayInfo';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

type BalanceField = 'vacation' | 'personalDays';

function resolveField(categoryName: string): BalanceField | null {
  const name = categoryName.trim().toLowerCase();
  if (name === 'vacation') return 'vacation';
  if (name === 'personal day' || name === 'personal days') return 'personalDays';
  return null;
}

function buildComment(field: BalanceField, days: number): string {
  const category = field === 'vacation' ? 'Vacation' : 'Personal day';
  if (days > 0) {
    return `${category} balance deducted — time-off request created or updated (delta: +${days} days)`;
  }
  return `${category} balance restored — time-off cancelled or updated (delta: ${days} days)`;
}

export async function adjustWorkdayBalance(
  teamMemberId: number,
  categoryName: string,
  days: number,
  createdBy: string
): Promise<void> {
  const field = resolveField(categoryName);
  if (!field) return;
  if (days === 0) return;

  const member = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { workdayId: true },
  });

  if (!member?.workdayId) return;

  const oldValues = await getWorkdayInfoById(member.workdayId);
  if (!oldValues) return;

  const currentBalance = oldValues[field] !== null ? Number(oldValues[field]) : 0;
  const newBalance = Math.max(0, currentBalance - days);

  const newValues = await updateWorkdayInfo(member.workdayId, { [field]: newBalance });

  await auditOrchestrator.log({
    entityName: 'es_win_workday_info',
    entityId: member.workdayId,
    createdBy,
    oldValues: oldValues as Record<string, unknown>,
    newValues: newValues as Record<string, unknown>,
    comment: buildComment(field, days),
  });
}

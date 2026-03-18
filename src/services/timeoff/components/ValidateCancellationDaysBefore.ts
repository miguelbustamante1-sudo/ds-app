import { prisma } from '../../../db/prisma';

interface ValidateCancellationDaysBeforeInput {
  startDate: Date;
  categoryId: number | null;
  teamMemberId: number;
}

interface ValidationResult {
  valid: boolean;
  requiredDaysBefore?: number;
}

export async function validateCancellationDaysBefore(
  input: ValidateCancellationDaysBeforeInput
): Promise<ValidationResult> {
  const { startDate, categoryId, teamMemberId } = input;

  const teamMember = await prisma.teamMember.findUnique({
    where: { teamMemberId },
    select: { countryId: true },
  });

  const countryId = teamMember?.countryId ?? null;

  let daysBefore = 0;
  if (categoryId && countryId) {
    const categoryCountry = await prisma.categoryCountry.findFirst({
      where: { categoryId, countryId },
      select: { categoryCountryDaysBefore: true },
    });
    daysBefore = categoryCountry?.categoryCountryDaysBefore ?? 0;
  }

  const required = Math.max(daysBefore, 1);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((start.getTime() - today.getTime()) / 86_400_000);

  if (diffDays <= required) {
    return { valid: false, requiredDaysBefore: required };
  }

  return { valid: true };
}

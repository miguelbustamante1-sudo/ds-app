import { Prisma, TimeOff } from '@prisma/client';

export interface CreateProjectedVacationsInput {
  teamMemberId:    number;
  countryIso:      string | null | undefined;
  startDate:       Date;
  createdByUserId: number;
}

interface Installment {
  date: Date;
  days: number;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function adjustToMonday(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6) {
    const d = new Date(date);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (day === 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d;
  }
  return date;
}

function buildSchedule(countryIso: string | null | undefined, startDate: Date): Installment[] {
  if (countryIso === 'SV') {
    return [{ date: addMonths(startDate, 12), days: 15 }];
  }

  if (countryIso === 'GT' || countryIso == null) {
    return [
      { date: addMonths(startDate, 4),  days: 5 },
      { date: addMonths(startDate, 8),  days: 5 },
      { date: addMonths(startDate, 12), days: 5 },
    ];
  }

  console.warn(
    `createProjectedVacations: unknown countryIso "${countryIso}" — no vacations projected.`,
  );
  return [];
}

export async function createProjectedVacations(
  tx: Prisma.TransactionClient,
  input: CreateProjectedVacationsInput,
): Promise<TimeOff[]> {
  const { teamMemberId, countryIso, startDate, createdByUserId } = input;

  const category = await tx.timeOffCategory.findFirst({
    where: { categoryName: { equals: 'Vacation', mode: 'insensitive' } },
  });
  if (!category) {
    throw new Error('TimeOffCategory "Vacation" not found — cannot project vacations.');
  }

  const status = await tx.timeOffStatus.findFirst({
    where: { statusName: { equals: 'Pending', mode: 'insensitive' } },
  });
  if (!status) {
    throw new Error('TimeOffStatus "Pending" not found — cannot project vacations.');
  }

  const schedule = buildSchedule(countryIso, startDate);
  if (schedule.length === 0) {
    return [];
  }

  const now = new Date();

  const records = schedule.map(({ date, days }) => {
    const adjustedStart = adjustToMonday(date);
    const adjustedEnd   = new Date(adjustedStart);
    adjustedEnd.setDate(adjustedEnd.getDate() + (days - 1));

    return {
      teamMemberId,
      categoryId:        category.categoryId,
      statusId:          status.statusId,
      timeOffStartDate:  adjustedStart,
      timeOffEndDate:    adjustedEnd,
      timeOffDays:       days,
      timeOffIsProjected: true,
      timeOffActive:     1,
      timeOffCreatedBy:  createdByUserId,
      timeOffCreatedDate: now,
    };
  });

  await tx.timeOff.createMany({ data: records });

  return tx.timeOff.findMany({
    where: {
      teamMemberId,
      timeOffIsProjected: true,
      timeOffCreatedDate: { gte: now },
    },
  });
}

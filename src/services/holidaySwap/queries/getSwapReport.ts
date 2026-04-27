import { prisma } from '../../../db/prisma';

export interface HolidaySwapReportRow {
  teamMemberName: string;
  holidayName: string;
  holidayDate: Date;
  replacementDate: Date;
  daysDifference: number;
  sameMonth: boolean;
}

export async function getSwapReport(): Promise<HolidaySwapReportRow[]> {
  const swaps = await prisma.holidaySwap.findMany({
    include: {
      teamMember: {
        select: {
          teamMemberNames: true,
          teamMemberSurnames: true,
        },
      },
      holiday: {
        select: {
          holidayName: true,
          holidayDate: true,
        },
      },
    },
    orderBy: { originalDate: 'asc' },
  });

  return swaps.map((s) => {
    const holidayDate = s.holiday.holidayDate;
    const replacementDate = s.replacementDate;
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDifference = Math.round(
      (replacementDate.getTime() - holidayDate.getTime()) / msPerDay
    );
    const sameMonth =
      holidayDate.getUTCMonth() === replacementDate.getUTCMonth() &&
      holidayDate.getUTCFullYear() === replacementDate.getUTCFullYear();

    return {
      teamMemberName: `${s.teamMember.teamMemberNames} ${s.teamMember.teamMemberSurnames}`,
      holidayName: s.holiday.holidayName,
      holidayDate,
      replacementDate,
      daysDifference,
      sameMonth,
    };
  });
}

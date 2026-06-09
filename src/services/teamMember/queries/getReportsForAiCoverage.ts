import { getReports } from './getReports';
import { prisma } from '../../../db/prisma';

export interface CoverageDensityWeek {
  isoWeek: string;
  weekStart: string;
  weekEnd: string;
  peopleOffCount: number;
  names: string[];
}

const ACTIVE_STATUS_IDS = [1, 2, 3];
const DENSITY_THRESHOLD = 3;

function getIsoWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns weeks in the next `daysAhead` days where 3+ team members
 * under `supervisorTeamMemberId` have active time-off simultaneously.
 *
 * Rule 3.6 compliant: uses canonical getReports() — no custom CTE.
 */
export async function getReportsForAiCoverage(
  supervisorTeamMemberId: number,
  daysAhead: number = 90
): Promise<CoverageDensityWeek[]> {
  const reports = await getReports(supervisorTeamMemberId, true);
  const teamMemberIds = reports.map((r) => r.teamMemberId);

  if (teamMemberIds.length === 0) return [];

  const today = new Date();
  const until = new Date(today);
  until.setDate(today.getDate() + daysAhead);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId: { in: teamMemberIds },
      statusId: { in: ACTIVE_STATUS_IDS },
      timeOffEndDate: { gte: today },
      timeOffStartDate: { lte: until },
    },
    select: {
      teamMemberId: true,
      timeOffStartDate: true,
      timeOffEndDate: true,
      teamMember: { select: { teamMemberNames: true } },
    },
  });

  const weekMap = new Map<
    string,
    { memberIds: Set<number>; names: Set<string>; monday: Date }
  >();

  for (const tof of timeOffs) {
    const start = new Date(tof.timeOffStartDate);
    const end = new Date(tof.timeOffEndDate);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        const isoWeek = getIsoWeek(cursor);
        if (!weekMap.has(isoWeek)) {
          weekMap.set(isoWeek, {
            memberIds: new Set(),
            names: new Set(),
            monday: getMondayOfWeek(cursor),
          });
        }
        const entry = weekMap.get(isoWeek);
        if (entry && tof.teamMemberId !== null) {
          entry.memberIds.add(tof.teamMemberId);
          if (tof.teamMember) {
            entry.names.add(tof.teamMember.teamMemberNames);
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const results: CoverageDensityWeek[] = [];

  for (const [isoWeek, { memberIds, names, monday }] of weekMap.entries()) {
    if (memberIds.size >= DENSITY_THRESHOLD) {
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      results.push({
        isoWeek,
        weekStart: monday.toISOString(),
        weekEnd: sunday.toISOString(),
        peopleOffCount: memberIds.size,
        names: Array.from(names).sort(),
      });
    }
  }

  return results.sort((a, b) => a.isoWeek.localeCompare(b.isoWeek));
}

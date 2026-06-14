/**
 * Dashboard Important Dates Service
 *
 * Returns a chronologically sorted list of upcoming events for the next 60 days:
 *   - Approved / Active Time Offs (started or starting soon) for direct reports + self
 *   - Upcoming Holidays for the user's country (next 60 days)
 *   - Birthdays from WorkdayInfo for direct reports (within next 30 days)
 */

import { prisma } from '../../db/prisma';
import { getReportsForPendingRequests } from '../teamMember/queries/getReportsForPendingRequests';

export interface ImportantDateItem {
  id: string;
  type: 'TimeOff' | 'Holiday' | 'Birthday';
  date: string;   // ISO date string YYYY-MM-DD
  month: string;  // e.g. "APR"
  day: number;
  title: string;
  description: string;
}

interface TeamMemberRecord {
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

function monthLabel(d: Date): string {
  return MONTHS[d.getMonth()] ?? 'UNK';
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

export async function getDashboardImportantDates(
  supervisorId: number,
): Promise<ImportantDateItem[]> {
  const items: ImportantDateItem[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon60 = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const horizon30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Resolve direct reports + self
  const members = await getReportsForPendingRequests(supervisorId);
  const memberIds = members.map((m) => m.teamMemberId);
  const allIds = [...new Set([supervisorId, ...memberIds])];

  // ── 1. Approved / Active Time Offs ──────────────────────────────────────────
  const approvedStatus = await prisma.timeOffStatus.findFirst({
    where: { statusName: { contains: 'Approved', mode: 'insensitive' } },
  });

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId: { in: allIds },
      timeOffActive: 1,
      timeOffEndDate: { gte: today },
      timeOffStartDate: { lte: horizon60 },
      ...(approvedStatus ? { statusId: approvedStatus.statusId } : {}),
    },
    include: {
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  for (const t of timeOffs) {
    const name = `${t.teamMember?.teamMemberNames ?? ''} ${t.teamMember?.teamMemberSurnames ?? ''}`.trim();
    const start = new Date(t.timeOffStartDate);
    const end = new Date(t.timeOffEndDate);
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    items.push({
      id: `tto-${t.timeOffId}`,
      type: 'TimeOff',
      date: isoDate(start),
      month: monthLabel(start),
      day: start.getDate(),
      title: 'Time Off',
      description: `${name} — Until ${endLabel}`,
    });
  }

  // ── 2. Upcoming Holidays ─────────────────────────────────────────────────────
  // Resolve the country from the supervisor's team member record
  const supervisorRecord = await prisma.teamMember.findUnique({
    where: { teamMemberId: supervisorId },
    select: { countryId: true },
  });
  const resolvedCountryId = supervisorRecord?.countryId ?? null;

  const holidays = await prisma.holiday.findMany({
    where: {
      holidayIsActive: true,
      holidayDate: { gte: today, lte: horizon60 },
      ...(resolvedCountryId != null ? { countryId: resolvedCountryId } : {}),
    },
    orderBy: { holidayDate: 'asc' },
  });

  for (const h of holidays) {
    const d = new Date(h.holidayDate);
    items.push({
      id: `hol-${h.holidayId}`,
      type: 'Holiday',
      date: isoDate(d),
      month: monthLabel(d),
      day: d.getDate(),
      title: 'Holiday',
      description: h.holidayName,
    });
  }

  // ── 3. Birthdays from WorkdayInfo ─────────────────────────────────────────────
  const teamMemberRecords: TeamMemberRecord[] = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: allIds }, workdayId: { not: null } },
    select: { teamMemberId: true, teamMemberNames: true, teamMemberSurnames: true, workdayId: true },
  });

  const wdIds = teamMemberRecords.map((m) => m.workdayId).filter((id): id is string => id !== null);

  if (wdIds.length > 0) {
    const workdayInfos = await prisma.workdayInfo.findMany({
      where: { wdid: { in: wdIds }, birthDate: { not: null } },
      select: { wdid: true, birthDate: true },
    });

    const wdMap = new Map<string, TeamMemberRecord>(
      teamMemberRecords
        .filter((m): m is TeamMemberRecord & { workdayId: string } => m.workdayId !== null)
        .map((m) => [m.workdayId, m]),
    );

    const thisYear = today.getFullYear();

    for (const wi of workdayInfos) {
      if (!wi.birthDate) continue;
      const raw = wi.birthDate.toString();
      let bMonth: number;
      let bDay: number;

      if (raw.includes('-')) {
        const parts = raw.split('-');
        bMonth = parseInt(parts[1] ?? '0', 10) - 1;
        bDay = parseInt(parts[2] ?? '0', 10);
      } else if (raw.includes('/')) {
        const parts = raw.split('/');
        bMonth = parseInt(parts[0] ?? '0', 10) - 1;
        bDay = parseInt(parts[1] ?? '0', 10);
      } else {
        continue;
      }

      const occurrences = [
        new Date(thisYear, bMonth, bDay),
        new Date(thisYear + 1, bMonth, bDay),
      ];

      for (const occ of occurrences) {
        if (occ >= today && occ <= horizon30) {
          const member = wdMap.get(wi.wdid);
          if (!member) break;
          items.push({
            id: `bday-${member.teamMemberId}`,
            type: 'Birthday',
            date: isoDate(occ),
            month: monthLabel(occ),
            day: occ.getDate(),
            title: 'Birthday 🎂',
            description: `${member.teamMemberNames} ${member.teamMemberSurnames}`.trim(),
          });
          break;
        }
      }
    }
  }

  // Sort chronologically
  items.sort((a, b) => a.date.localeCompare(b.date));

  return items;
}

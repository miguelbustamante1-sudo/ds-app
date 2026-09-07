/**
 * Dashboard Important Dates Service
 *
 * Returns a chronologically sorted list of upcoming events for the next 60 days:
 *   - Active Time Offs, any status except Cancelled/Rejected/Split (started or starting soon) for direct reports + self
 *   - Active Holiday Swaps, same status/window filter as Time Off, for direct reports + self
 *   - Upcoming Holidays for the user's country (next 60 days)
 *   - Birthdays from WorkdayInfo for direct reports (within next 30 days)
 */

import { prisma } from '../../db/prisma';
import { getReportsForPendingRequests } from '../teamMember/queries/getReportsForPendingRequests';

const CANCELLED_STATUS_ID = 4;
const REJECTED_STATUS_ID = 5;
const SPLIT_STATUS_ID = 6;

export interface ImportantDateItem {
  id: string;
  type: 'TimeOff' | 'HolidaySwap' | 'Holiday' | 'Birthday';
  date: string;                // ISO date string YYYY-MM-DD — start/original date for TimeOff/HolidaySwap, holiday date, or birthday occurrence
  endDate?: string;            // TimeOff / HolidaySwap only — ISO date string YYYY-MM-DD (end date / replacement date), formatting is left to the frontend
  month: string;               // e.g. "APR"
  day: number;
  name?: string;                // TimeOff / HolidaySwap / Birthday — team member's full name
  workdayId?: string | null;    // TimeOff / HolidaySwap / Birthday
  recordId?: number;            // TimeOff / HolidaySwap — timeOffId / holidaySwapId, for click-through navigation
  categoryName?: string;        // TimeOff only — e.g. "Vacation"
  holidayName?: string;         // Holiday only
  countryCode?: string | null;  // Holiday only — ISO-2 code (GT/SV/MX)
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

  // ── 1. Active Time Offs (any status except Cancelled/Rejected/Split) ────────
  const timeOffs = await prisma.timeOff.findMany({
    where: {
      teamMemberId: { in: allIds },
      timeOffActive: 1,
      timeOffEndDate: { gte: today },
      timeOffStartDate: { lte: horizon60 },
      statusId: { notIn: [CANCELLED_STATUS_ID, REJECTED_STATUS_ID, SPLIT_STATUS_ID] },
    },
    include: {
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
      category: { select: { categoryName: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  for (const t of timeOffs) {
    const name = `${t.teamMember?.teamMemberNames ?? ''} ${t.teamMember?.teamMemberSurnames ?? ''}`.trim();
    const start = new Date(t.timeOffStartDate);
    const end = new Date(t.timeOffEndDate);
    items.push({
      id: `tto-${t.timeOffId}`,
      type: 'TimeOff',
      date: isoDate(start),
      endDate: isoDate(end),
      month: monthLabel(start),
      day: start.getDate(),
      name,
      workdayId: t.teamMember?.workdayId ?? null,
      categoryName: t.category?.categoryName ?? 'Time Off',
      recordId: t.timeOffId,
    });
  }

  // ── 2. Active Holiday Swaps (same status/window filter as Time Off) ─────────
  // originalDate/replacementDate play the role of timeOffStartDate/timeOffEndDate above.
  const holidaySwaps = await prisma.holidaySwap.findMany({
    where: {
      teamMemberId: { in: allIds },
      active: true,
      replacementDate: { gte: today },
      originalDate: { lte: horizon60 },
      statusId: { notIn: [CANCELLED_STATUS_ID, REJECTED_STATUS_ID, SPLIT_STATUS_ID] },
    },
    include: {
      teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true, workdayId: true } },
    },
    orderBy: { originalDate: 'asc' },
  });

  for (const s of holidaySwaps) {
    const name = `${s.teamMember.teamMemberNames} ${s.teamMember.teamMemberSurnames}`.trim();
    const original = new Date(s.originalDate);
    const replacement = new Date(s.replacementDate);
    items.push({
      id: `hsw-${s.holidaySwapId}`,
      type: 'HolidaySwap',
      date: isoDate(original),
      endDate: isoDate(replacement),
      month: monthLabel(original),
      day: original.getDate(),
      name,
      workdayId: s.teamMember.workdayId ?? null,
      recordId: s.holidaySwapId,
    });
  }

  // ── 3. Upcoming Holidays ─────────────────────────────────────────────────────
  // Show holidays for all countries across the supervisor's team (cross-regional leaders)
  const teamCountryRecords = await prisma.teamMember.findMany({
    where: { teamMemberId: { in: allIds }, countryId: { not: null } },
    select: { countryId: true },
  });
  const teamCountryIds = [...new Set(teamCountryRecords.map((m) => m.countryId).filter((id): id is number => id !== null))];

  const holidays = await prisma.holiday.findMany({
    where: {
      holidayIsActive: true,
      holidayDate: { gte: today, lte: horizon60 },
      ...(teamCountryIds.length > 0 ? { countryId: { in: teamCountryIds } } : {}),
    },
    include: {
      country: { select: { countryIso: true } },
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
      holidayName: h.holidayName,
      countryCode: h.country?.countryIso ?? null,
    });
  }

  // ── 4. Birthdays from WorkdayInfo ─────────────────────────────────────────────
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
            name: `${member.teamMemberNames} ${member.teamMemberSurnames}`.trim(),
            workdayId: member.workdayId,
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

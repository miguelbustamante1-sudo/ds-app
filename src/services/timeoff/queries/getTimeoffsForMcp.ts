import { prisma } from '../../../db/prisma';
import type { TimeOffSummary, TimeOffChangeEntry, TimeOffChangedField } from '../../../mcp/types';

// ─── Changelog helpers ────────────────────────────────────────────────────────

type RawValues = Record<string, unknown> | null;
type RefMaps = { statusMap: Map<number, string>; categoryMap: Map<number, string> };

const DIFF_FIELDS: {
  key: string;
  label: string;
  resolve?: (val: unknown, maps: RefMaps) => string | null;
}[] = [
  { key: 'tto_stadat', label: 'startDate' },
  { key: 'tto_enddat', label: 'endDate' },
  { key: 'days', label: 'days' },
  {
    key: 'sta_id',
    label: 'status',
    resolve: (val, { statusMap }) =>
      val != null ? (statusMap.get(Number(val)) ?? String(val)) : null,
  },
  {
    key: 'tot_id',
    label: 'category',
    resolve: (val, { categoryMap }) =>
      val != null ? (categoryMap.get(Number(val)) ?? String(val)) : null,
  },
  { key: 'active', label: 'active' },
];

function computeDiff(
  oldValues: RawValues,
  newValues: RawValues,
  maps: RefMaps
): TimeOffChangedField[] {
  if (!oldValues || !newValues) return [];

  const changed: TimeOffChangedField[] = [];
  for (const { key, label, resolve } of DIFF_FIELDS) {
    const rawFrom = oldValues[key] ?? null;
    const rawTo = newValues[key] ?? null;

    const from = resolve
      ? resolve(rawFrom, maps)
      : rawFrom != null
        ? String(rawFrom).split('T')[0] ?? null
        : null;
    const to = resolve
      ? resolve(rawTo, maps)
      : rawTo != null
        ? String(rawTo).split('T')[0] ?? null
        : null;

    if (from !== to) {
      changed.push({ field: label, from, to });
    }
  }
  return changed;
}

async function attachChangelogs<T extends { timeOffId: number }>(
  results: T[],
  buildSummary: (r: T, changelog: TimeOffChangeEntry[]) => TimeOffSummary
): Promise<TimeOffSummary[]> {
  if (results.length === 0) return [];

  const timeOffIds = results.map((r) => r.timeOffId);

  const changelogs = await prisma.timeOffChangeLog.findMany({
    where: { timeOffId: { in: timeOffIds } },
    orderBy: { changeLogCreatedDate: 'asc' },
  });

  const statusIds = new Set<number>();
  const categoryIds = new Set<number>();
  for (const log of changelogs) {
    for (const values of [log.changeLogOldValues, log.changeLogNewValues] as RawValues[]) {
      if (!values) continue;
      if (values['sta_id'] != null) statusIds.add(Number(values['sta_id']));
      if (values['tot_id'] != null) categoryIds.add(Number(values['tot_id']));
    }
  }

  const [statuses, categories] = await Promise.all([
    statusIds.size > 0
      ? prisma.timeOffStatus.findMany({
          where: { statusId: { in: [...statusIds] } },
          select: { statusId: true, statusName: true },
        })
      : Promise.resolve([]),
    categoryIds.size > 0
      ? prisma.timeOffCategory.findMany({
          where: { categoryId: { in: [...categoryIds] } },
          select: { categoryId: true, categoryName: true },
        })
      : Promise.resolve([]),
  ]);

  const maps: RefMaps = {
    statusMap: new Map(statuses.map((s) => [s.statusId, s.statusName])),
    categoryMap: new Map(categories.map((c) => [c.categoryId, c.categoryName])),
  };

  const byTimeOffId = new Map<number, typeof changelogs>();
  for (const log of changelogs) {
    if (!log.timeOffId) continue;
    const existing = byTimeOffId.get(log.timeOffId);
    if (existing) {
      existing.push(log);
    } else {
      byTimeOffId.set(log.timeOffId, [log]);
    }
  }

  return results.map((r) => {
    const logs = byTimeOffId.get(r.timeOffId) ?? [];
    const changelog: TimeOffChangeEntry[] = logs.map((log) => ({
      createdAt: log.changeLogCreatedDate?.toISOString().split('T')[0] ?? '',
      comment: log.changeLogComment,
      changedFields: computeDiff(
        log.changeLogOldValues as RawValues,
        log.changeLogNewValues as RawValues,
        maps
      ),
    }));
    return buildSummary(r, changelog);
  });
}

// ─── Public query functions ───────────────────────────────────────────────────

export async function getUpcomingTimeoffs(teamMemberId: number): Promise<TimeOffSummary[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await prisma.timeOff.findMany({
    where: {
      teamMemberId,
      timeOffActive: 1,
      timeOffIsProjected: false,
      timeOffEndDate: { gte: today },
      status: { statusName: { in: ['Tentative', 'Acknowledged'] } },
    },
    include: {
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  return attachChangelogs(results, (r, changelog) => ({
    timeOffId: r.timeOffId,
    startDate: r.timeOffStartDate.toISOString().split('T')[0] ?? '',
    endDate: r.timeOffEndDate.toISOString().split('T')[0] ?? '',
    days: Number(r.timeOffDays),
    category: r.category?.categoryName ?? null,
    status: r.status?.statusName ?? null,
    changelog,
  }));
}

export async function getTimeoffHistory(
  teamMemberId: number,
  year: number
): Promise<TimeOffSummary[]> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const results = await prisma.timeOff.findMany({
    where: {
      teamMemberId,
      timeOffActive: 1,
      timeOffIsProjected: false,
      timeOffStartDate: { gte: yearStart, lte: yearEnd },
    },
    include: {
      category: { select: { categoryName: true } },
      status: { select: { statusName: true } },
    },
    orderBy: { timeOffStartDate: 'asc' },
  });

  return attachChangelogs(results, (r, changelog) => ({
    timeOffId: r.timeOffId,
    startDate: r.timeOffStartDate.toISOString().split('T')[0] ?? '',
    endDate: r.timeOffEndDate.toISOString().split('T')[0] ?? '',
    days: Number(r.timeOffDays),
    category: r.category?.categoryName ?? null,
    status: r.status?.statusName ?? null,
    changelog,
  }));
}

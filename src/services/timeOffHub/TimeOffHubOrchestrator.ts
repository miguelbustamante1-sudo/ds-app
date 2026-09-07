import { getReportsForTimeOffHubSummary } from '../teamMember/queries/getReportsForTimeOffHubSummary';
import { fetchUpcomingTimeOffRecords } from './components/fetchUpcomingTimeOffRecords';
import { fetchUpcomingHolidaySwapRecords } from './components/fetchUpcomingHolidaySwapRecords';
import { resolveUpcomingWindow, resolveThisWeekWindow } from './components/resolveWindows';

export type TimeOffHubSummaryTab = 'upcoming-timeoff' | 'upcoming-swaps' | 'this-week';
export type TimeOffHubSummaryScope = 'direct' | 'hierarchy';

export interface TimeOffHubSummaryCounts {
  hasDirectReports: boolean;
  upcomingTimeOff: number;
  upcomingHolidaySwaps: number;
  thisWeek: number;
}

export interface TimeOffHubSummaryRecord {
  id: string; // "tto-123" / "hsw-456"
  type: 'TimeOff' | 'HolidaySwap';
  recordId: number; // timeOffId / holidaySwapId — for click-through
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  workdayId: string | null;
  date: string; // start / originalDate — ISO YYYY-MM-DD
  endDate: string; // end / replacementDate — ISO YYYY-MM-DD
  categoryName?: string; // TimeOff only
  statusId: number;
  statusName: string;
}

async function fetchRecordsForTab(
  tab: TimeOffHubSummaryTab,
  teamMemberIds: number[],
): Promise<TimeOffHubSummaryRecord[]> {
  if (tab === 'upcoming-timeoff') {
    return fetchUpcomingTimeOffRecords(teamMemberIds, resolveUpcomingWindow());
  }
  if (tab === 'upcoming-swaps') {
    return fetchUpcomingHolidaySwapRecords(teamMemberIds, resolveUpcomingWindow());
  }
  const window = resolveThisWeekWindow();
  const [timeOff, swaps] = await Promise.all([
    fetchUpcomingTimeOffRecords(teamMemberIds, window),
    fetchUpcomingHolidaySwapRecords(teamMemberIds, window),
  ]);
  return [...timeOff, ...swaps].sort((a, b) => a.date.localeCompare(b.date));
}

function countUniquePeople(records: TimeOffHubSummaryRecord[]): number {
  return new Set(records.map((r) => r.teamMemberId)).size;
}

export async function getSummaryCounts(
  supervisorId: number,
  scope: TimeOffHubSummaryScope,
): Promise<TimeOffHubSummaryCounts> {
  const directReports = await getReportsForTimeOffHubSummary(supervisorId, false);
  const hasDirectReports = directReports.length > 0;

  if (!hasDirectReports) {
    return { hasDirectReports: false, upcomingTimeOff: 0, upcomingHolidaySwaps: 0, thisWeek: 0 };
  }

  const teamMemberIds = scope === 'hierarchy'
    ? (await getReportsForTimeOffHubSummary(supervisorId, true)).map((m) => m.teamMemberId)
    : directReports.map((m) => m.teamMemberId);

  const [upcomingTimeOff, upcomingHolidaySwaps, thisWeek] = await Promise.all([
    fetchRecordsForTab('upcoming-timeoff', teamMemberIds),
    fetchRecordsForTab('upcoming-swaps', teamMemberIds),
    fetchRecordsForTab('this-week', teamMemberIds),
  ]);

  return {
    hasDirectReports: true,
    upcomingTimeOff: countUniquePeople(upcomingTimeOff),
    upcomingHolidaySwaps: countUniquePeople(upcomingHolidaySwaps),
    thisWeek: countUniquePeople(thisWeek),
  };
}

export async function getSummaryRecords(
  supervisorId: number,
  scope: TimeOffHubSummaryScope,
  tab: TimeOffHubSummaryTab,
): Promise<TimeOffHubSummaryRecord[]> {
  const members = await getReportsForTimeOffHubSummary(supervisorId, scope === 'hierarchy');
  const teamMemberIds = members.map((m) => m.teamMemberId);
  return fetchRecordsForTab(tab, teamMemberIds);
}

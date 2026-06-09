import type { AiToolContext } from '../types';
import {
  getAllTeamTimeOffs,
  getTeamTimeOffCurrentMonth,
  getTeamYearlySummary,
  getTeamMemberTimeOffBreakdown,
} from '../../timeoff/supervisor';
import { getReportsForAiCoverage } from '../../teamMember/queries/getReportsForAiCoverage';
import { getReportsForAiHolidaySwaps } from '../../teamMember/queries/getReportsForAiHolidaySwaps';
import { getMySwaps } from '../../holidaySwap/queries/getMySwaps';
import { AppError } from '../../../errors/AppError';

const STRIP_KEYS = new Set([
  'teamMemberId',
  'supervisorId',
  'timeOffId',
  'statusId',
  'categoryId',
  'holidayId',
  'holidaySwapId',
  'workdayId',
  'reportLevel',
  'changeLogCount',
  'teamMemberEndDate',
]);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(value: unknown): string {
  const d = new Date(value as string);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

const DATE_KEYS = new Set([
  'timeOffStartDate', 'timeOffEndDate', 'originalDate', 'replacementDate',
  'weekStart', 'weekEnd',
]);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !STRIP_KEYS.has(k))
        .map(([k, v]) => [k, DATE_KEYS.has(k) ? formatDate(v) : scrub(v)])
    );
  }
  return value;
}

/**
 * Executes a tool call requested by the AI model.
 * Returns scrubbed, ID-free data safe to include in a prompt.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AiToolContext
): Promise<unknown> {
  const today = new Date();

  const result = await executeToolInner(toolName, args, ctx, today);
  console.log(`[AI tool] ${toolName}`, JSON.stringify(result));
  return result;
}

async function executeToolInner(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AiToolContext,
  today: Date
): Promise<unknown> {
  switch (toolName) {
    case 'get_upcoming_tentative': {
      const in45Days = new Date(today);
      in45Days.setDate(today.getDate() + 45);
      const data = await getAllTeamTimeOffs(ctx.supervisorTeamMemberId);
      return scrub(
        data
          .filter((t) => t.statusId === 1)
          .filter((t) => new Date(t.timeOffEndDate) >= today)      // exclude past records
          .filter((t) => new Date(t.timeOffStartDate) <= in45Days) // starts within 45 days
      );
    }

    case 'get_monthly_summary': {
      const data = await getTeamTimeOffCurrentMonth(ctx.supervisorTeamMemberId);
      return scrub({
        totalDays: data.totalDays,
        teamMembersCount: data.teamMembersCount,
        requests: data.teamMembersOnTimeOff,
      });
    }

    case 'get_coverage_density': {
      return getReportsForAiCoverage(ctx.supervisorTeamMemberId);
    }

    case 'get_team_timeoff_by_month': {
      const month =
        typeof args.month === 'string'
          ? args.month
          : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const parts = month.split('-');
      const targetYear = parseInt(parts[0] ?? '0', 10);
      const targetMonth = parseInt(parts[1] ?? '0', 10);
      const data = await getAllTeamTimeOffs(ctx.supervisorTeamMemberId);
      return scrub(
        data
          .filter((t) => ![4, 5, 6].includes(t.statusId ?? 0))
          .filter((t) => {
            const d = new Date(t.timeOffStartDate);
            return d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth;
          })
      );
    }

    case 'get_my_timeoff': {
      return scrub(await getTeamMemberTimeOffBreakdown(ctx.teamMemberId));
    }

    case 'get_yearly_summary': {
      return scrub(await getTeamYearlySummary(ctx.supervisorTeamMemberId));
    }

    case 'get_holiday_swaps': {
      const [mySwaps, teamSwaps] = await Promise.all([
        getMySwaps(ctx.teamMemberId),
        ctx.isSupervisor
          ? getReportsForAiHolidaySwaps(ctx.supervisorTeamMemberId)
          : Promise.resolve([]),
      ]);
      const mySwapsCleaned = mySwaps.map(({ holidayName, originalDate, replacementDate, statusName }) => ({
        teamMemberFullName: ctx.fullName,
        holidayName,
        originalDate,
        replacementDate,
        statusName,
      }));
      return [...mySwapsCleaned, ...teamSwaps];
    }

    default:
      throw new AppError(`Unknown AI tool: ${toolName}`, 400);
  }
}

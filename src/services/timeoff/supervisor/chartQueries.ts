/**
 * Chart Queries Service
 * Handles chart-specific queries with date range filtering
 */

import { prisma } from '../../../db/prisma';
import type { TimeOffByMonthDTO } from '@shared/dto/TimeOff';

/**
 * Raw query result for time-off by month aggregation
 */
interface RawTimeOffByMonth {
  year_month: string;
  total_days: number;
}

/**
 * Generate an array of month labels for the last 12 months from endDate backwards
 * Returns array like ['Apr 2025', 'May 2025', ..., 'Mar 2026']
 */
function getLast12Months(endDate: Date): { label: string; yearMonth: string }[] {
  const months: { label: string; yearMonth: string }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Start from 11 months before endDate and go to endDate's month
  for (let i = 11; i >= 0; i--) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const yearMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    months.push({
      label: `${monthNames[monthIndex]} ${year}`,
      yearMonth,
    });
  }

  return months;
}

/**
 * Get aggregated time-off days by month for all team members under a supervisor
 * Filters by date range and returns last 12 months from endDate backwards
 */
export async function getTeamTimeOffByMonthRange(
  supervisorTeamMemberId: number,
  startDate?: Date,
  endDate?: Date
): Promise<TimeOffByMonthDTO[]> {
  const today = new Date();

  // Default: last 12 months ending today
  const effectiveEndDate = endDate ?? today;
  const effectiveStartDate = startDate ?? new Date(effectiveEndDate.getFullYear(), effectiveEndDate.getMonth() - 11, 1);

  const results = await prisma.$queryRaw<RawTimeOffByMonth[]>`
    WITH RECURSIVE team_hierarchy AS (
      -- Base case: Direct reports
      SELECT sa.tms_id AS team_member_id
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.sup_id = ${supervisorTeamMemberId}
        AND sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})

      UNION ALL

      -- Recursive case: Indirect reports
      SELECT sa.tms_id AS team_member_id
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN team_hierarchy th ON sa.sup_id = th.team_member_id
      WHERE sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
    )
    SELECT
      TO_CHAR(tof.tto_stadat, 'YYYY-MM') AS year_month,
      COALESCE(SUM(tof.tto_days), 0)::int AS total_days
    FROM ds.tbl_tms_time_off tof
    INNER JOIN team_hierarchy th ON tof.tms_id = th.team_member_id
    WHERE tof.sta_id NOT IN (4, 6) -- 4 = Cancelled, 6 = Split
      AND tof.tto_stadat >= ${effectiveStartDate}
      AND tof.tto_stadat <= ${effectiveEndDate}
    GROUP BY TO_CHAR(tof.tto_stadat, 'YYYY-MM')
    ORDER BY year_month
  `;

  // Build map of results
  const monthMap = new Map<string, number>();
  results.forEach((row) => {
    monthMap.set(row.year_month, Number(row.total_days));
  });

  // Generate last 12 months and fill with data
  const last12Months = getLast12Months(effectiveEndDate);

  return last12Months.map(({ label, yearMonth }) => ({
    month: label,
    days: monthMap.get(yearMonth) ?? 0,
  }));
}

/**
 * Supervisor Queries Service
 * Handles hierarchical team member lookups for supervisors
 */

import { prisma } from '../../../db/prisma';
import type { SupervisedTeamMemberDTO, ReportType } from '@shared/dto/SupervisedTeamMember';
import type { TimeOffByMonthDTO, TimeOffByCountryDTO, TeamTimeOffCurrentMonthDTO, TeamMemberYearlySummaryDTO, TeamMemberTimeOffBreakdownDTO, TimeOffWithTeamMemberDTO } from '@shared/dto/TimeOff';

/**
 * Raw query result type from the recursive CTE
 */
interface RawSupervisedMember {
  team_member_id: number;
  workday_id: string | null;
  team_member_names: string;
  team_member_surnames: string;
  team_member_known_as: string | null;
  team_member_seniority: string;
  primary_role_name: string | null;
  country_id: number | null;
  country_name: string | null;
  country_iso: string | null;
  report_type: string;
  supervisor_assignment_start_date: Date;
  supervisor_assignment_end_date: Date | null;
  team_member_end_date: Date | null;
}

/**
 * Get all team members under a supervisor (direct and indirect reports)
 * Uses a recursive CTE to traverse the hierarchy unlimited depth
 * Only returns active assignments (current date between start/end)
 */
export async function getTeamMembersBySupervisor(
  supervisorTeamMemberId: number
): Promise<SupervisedTeamMemberDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawSupervisedMember[]>`
    WITH RECURSIVE team_hierarchy AS (
      -- Base case: Direct reports
      SELECT
        sa.tms_id AS team_member_id,
        sa.txs_stadat AS supervisor_assignment_start_date,
        sa.txs_enddat AS supervisor_assignment_end_date,
        'Direct'::text AS report_type,
        1 AS depth
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.sup_id = ${supervisorTeamMemberId}
        AND sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})

      UNION ALL

      -- Recursive case: Indirect reports
      SELECT
        sa.tms_id AS team_member_id,
        sa.txs_stadat AS supervisor_assignment_start_date,
        sa.txs_enddat AS supervisor_assignment_end_date,
        'Indirect'::text AS report_type,
        th.depth + 1 AS depth
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN team_hierarchy th ON sa.sup_id = th.team_member_id
      WHERE sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
        AND th.depth < 10 -- Safety limit to prevent infinite loops
    )
    SELECT DISTINCT ON (th.team_member_id)
      th.team_member_id,
      tm.wdid AS workday_id,
      tm.tms_names AS team_member_names,
      tm.tms_surnames AS team_member_surnames,
      tm.tms_known_as AS team_member_known_as,
      tm.tms_seniority AS team_member_seniority,
      r.rol_name AS primary_role_name,
      c.cou_id AS country_id,
      c.cou_name AS country_name,
      c.cou_iso AS country_iso,
      th.report_type,
      th.supervisor_assignment_start_date,
      th.supervisor_assignment_end_date,
      tm.tms_enddat AS team_member_end_date
    FROM team_hierarchy th
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = th.team_member_id
    LEFT JOIN ds.tbl_roles r ON r.rol_id = tm.tms_primary_role
    LEFT JOIN ds.tbl_countries c ON c.cou_id = tm.cou_id
    ORDER BY th.team_member_id, th.depth ASC
  `;

  return results.map((row) => ({
    teamMemberId: row.team_member_id,
    workdayId: row.workday_id,
    teamMemberNames: row.team_member_names,
    teamMemberSurnames: row.team_member_surnames,
    teamMemberKnownAs: row.team_member_known_as,
    teamMemberFullName: row.team_member_known_as
      ? `${row.team_member_known_as} ${row.team_member_surnames}`
      : `${row.team_member_names} ${row.team_member_surnames}`,
    teamMemberSeniority: row.team_member_seniority,
    primaryRoleName: row.primary_role_name,
    countryId: row.country_id,
    countryName: row.country_name,
    countryIso: row.country_iso,
    reportType: row.report_type as ReportType,
    supervisorAssignmentStartDate: row.supervisor_assignment_start_date,
    supervisorAssignmentEndDate: row.supervisor_assignment_end_date,
    teamMemberEndDate: row.team_member_end_date,
  }));
}

/**
 * Verify that a supervisor has authority over a team member
 * Used for authorization checks before time-off operations
 */
export async function verifySupervisorRelationship(
  supervisorTeamMemberId: number,
  teamMemberId: number
): Promise<boolean> {
  const today = new Date();

  const result = await prisma.$queryRaw<{ exists: boolean }[]>`
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
    SELECT EXISTS(
      SELECT 1 FROM team_hierarchy WHERE team_member_id = ${teamMemberId}
    ) AS exists
  `;

  return result[0]?.exists ?? false;
}

/**
 * Raw query result for time-off by month aggregation
 */
interface RawTimeOffByMonth {
  month_number: number;
  total_days: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Get aggregated time-off days by month for all team members under a supervisor
 * Uses a single SQL query with recursive CTE for efficiency
 */
export async function getTeamTimeOffByMonth(
  supervisorTeamMemberId: number,
  year?: number
): Promise<TimeOffByMonthDTO[]> {
  const today = new Date();
  const targetYear = year ?? today.getFullYear();

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
      EXTRACT(MONTH FROM tof.tto_stadat)::int AS month_number,
      COALESCE(SUM(tof.tto_days), 0)::int AS total_days
    FROM ds.tbl_tms_time_off tof
    INNER JOIN team_hierarchy th ON tof.tms_id = th.team_member_id
    WHERE tof.sta_id <> 4
      AND EXTRACT(YEAR FROM tof.tto_stadat) = ${targetYear}
    GROUP BY EXTRACT(MONTH FROM tof.tto_stadat)
    ORDER BY month_number
  `;

  // Build full 12-month array with zeros for missing months
  const monthMap = new Map<number, number>();
  results.forEach((row) => {
    monthMap.set(row.month_number, Number(row.total_days));
  });

  return MONTH_NAMES.map((month, index) => ({
    month,
    days: monthMap.get(index + 1) ?? 0,
  }));
}

/**
 * Raw query result for current month time-off
 */
interface RawCurrentMonthTimeOff {
  team_member_id: number;
  team_member_full_name: string;
  time_off_start_date: Date;
  time_off_end_date: Date;
  time_off_days: number;
  category_name: string;
}

/**
 * Get team time-off for the current month
 * Returns total days and list of team members on time-off
 */
export async function getTeamTimeOffCurrentMonth(
  supervisorTeamMemberId: number
): Promise<TeamTimeOffCurrentMonthDTO> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed

  const results = await prisma.$queryRaw<RawCurrentMonthTimeOff[]>`
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
      tof.tms_id AS team_member_id,
      CASE
        WHEN tm.tms_known_as IS NOT NULL THEN tm.tms_known_as || ' ' || tm.tms_surnames
        ELSE tm.tms_names || ' ' || tm.tms_surnames
      END AS team_member_full_name,
      tof.tto_stadat AS time_off_start_date,
      tof.tto_enddat AS time_off_end_date,
      tof.tto_days AS time_off_days,
      cat.cat_name AS category_name
    FROM ds.tbl_tms_time_off tof
    INNER JOIN team_hierarchy th ON tof.tms_id = th.team_member_id
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = tof.tms_id
    INNER JOIN ds.tbl_to_categories cat ON cat.cat_id = tof.cat_id
    WHERE tof.sta_id <> 4
      AND (
        (EXTRACT(YEAR FROM tof.tto_stadat) = ${currentYear} AND EXTRACT(MONTH FROM tof.tto_stadat) = ${currentMonth})
        OR (EXTRACT(YEAR FROM tof.tto_enddat) = ${currentYear} AND EXTRACT(MONTH FROM tof.tto_enddat) = ${currentMonth})
        OR (tof.tto_stadat <= make_date(${currentYear}, ${currentMonth}, 1) AND tof.tto_enddat >= (make_date(${currentYear}, ${currentMonth}, 1) + interval '1 month - 1 day')::date)
      )
    ORDER BY tof.tto_stadat ASC
  `;

  const teamMembersOnTimeOff = results.map((row) => ({
    teamMemberId: row.team_member_id,
    teamMemberFullName: row.team_member_full_name,
    timeOffStartDate: row.time_off_start_date,
    timeOffEndDate: row.time_off_end_date,
    timeOffDays: Number(row.time_off_days),
    categoryName: row.category_name,
  }));

  const totalDays = teamMembersOnTimeOff.reduce((sum, item) => sum + item.timeOffDays, 0);
  const uniqueTeamMembers = new Set(teamMembersOnTimeOff.map((item) => item.teamMemberId));

  return {
    totalDays,
    teamMembersCount: uniqueTeamMembers.size,
    teamMembersOnTimeOff,
  };
}

/**
 * Raw query result for yearly summary
 */
interface RawYearlySummary {
  team_member_id: number;
  total_days: number;
}

/**
 * Get yearly time-off summary for all team members under a supervisor
 * Returns total days per team member for the current year
 */
export async function getTeamYearlySummary(
  supervisorTeamMemberId: number,
  year?: number
): Promise<TeamMemberYearlySummaryDTO[]> {
  const today = new Date();
  const targetYear = year ?? today.getFullYear();

  const results = await prisma.$queryRaw<RawYearlySummary[]>`
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
      th.team_member_id,
      COALESCE(SUM(tof.tto_days), 0)::int AS total_days
    FROM team_hierarchy th
    LEFT JOIN ds.tbl_tms_time_off tof ON tof.tms_id = th.team_member_id
      AND tof.sta_id <> 4
      AND EXTRACT(YEAR FROM tof.tto_stadat) = ${targetYear}
    GROUP BY th.team_member_id
  `;

  return results.map((row) => ({
    teamMemberId: row.team_member_id,
    totalDays: Number(row.total_days),
  }));
}

/**
 * Raw query result for category breakdown
 */
interface RawCategoryBreakdown {
  category_id: number;
  category_name: string;
  total_days: number;
}

/**
 * Get time-off breakdown by category for a specific team member
 */
export async function getTeamMemberTimeOffBreakdown(
  teamMemberId: number,
  year?: number
): Promise<TeamMemberTimeOffBreakdownDTO> {
  const today = new Date();
  const targetYear = year ?? today.getFullYear();

  const results = await prisma.$queryRaw<RawCategoryBreakdown[]>`
    SELECT
      cat.cat_id AS category_id,
      cat.cat_name AS category_name,
      COALESCE(SUM(tof.tto_days), 0)::int AS total_days
    FROM ds.tbl_tms_time_off tof
    INNER JOIN ds.tbl_to_categories cat ON cat.cat_id = tof.cat_id
    WHERE tof.tms_id = ${teamMemberId}
      AND tof.sta_id <> 4
      AND EXTRACT(YEAR FROM tof.tto_stadat) = ${targetYear}
    GROUP BY cat.cat_id, cat.cat_name
    ORDER BY total_days DESC
  `;

  const breakdown = results.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalDays: Number(row.total_days),
  }));

  const totalDays = breakdown.reduce((sum, item) => sum + item.totalDays, 0);

  return {
    teamMemberId,
    year: targetYear,
    totalDays,
    breakdown,
  };
}

/**
 * Raw query result for all team time-offs
 */
interface RawAllTeamTimeOff {
  time_off_id: number;
  team_member_id: number;
  team_member_full_name: string;
  workday_id: string;
  team_member_end_date: Date | null;
  country_iso: string | null;
  time_off_start_date: Date;
  time_off_end_date: Date;
  time_off_days: number;
  category_id: number | null;
  category_name: string;
  status_id: number | null;
  status_name: string;
}

/**
 * Get all time-offs for all team members under a supervisor
 * Returns detailed time-off records with team member information
 */
export async function getAllTeamTimeOffs(
  supervisorTeamMemberId: number
): Promise<TimeOffWithTeamMemberDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawAllTeamTimeOff[]>`
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
      tof.tto_id AS time_off_id,
      tof.tms_id AS team_member_id,
      CASE
        WHEN tm.tms_known_as IS NOT NULL THEN tm.tms_known_as || ' ' || tm.tms_surnames
        ELSE tm.tms_names || ' ' || tm.tms_surnames
      END AS team_member_full_name,
      tm.wdid AS workday_id,
      tm.tms_enddat AS team_member_end_date,
      c.cou_iso AS country_iso,
      tof.tto_stadat AS time_off_start_date,
      tof.tto_enddat AS time_off_end_date,
      tof.tto_days AS time_off_days,
      tof.cat_id AS category_id,
      cat.cat_name AS category_name,
      tof.sta_id AS status_id,
      sta.sta_name AS status_name
    FROM ds.tbl_tms_time_off tof
    INNER JOIN team_hierarchy th ON tof.tms_id = th.team_member_id
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = tof.tms_id
    LEFT JOIN ds.tbl_countries c ON c.cou_id = tm.cou_id
    INNER JOIN ds.tbl_to_categories cat ON cat.cat_id = tof.cat_id
    INNER JOIN ds.tbl_to_statuses sta ON sta.sta_id = tof.sta_id
    ORDER BY tof.tto_stadat DESC
  `;

  return results.map((row) => ({
    timeOffId: row.time_off_id,
    teamMemberId: row.team_member_id,
    teamMemberFullName: row.team_member_full_name,
    workdayId: row.workday_id,
    teamMemberEndDate: row.team_member_end_date,
    countryIso: row.country_iso,
    timeOffStartDate: row.time_off_start_date,
    timeOffEndDate: row.time_off_end_date,
    timeOffDays: Number(row.time_off_days),
    categoryId: row.category_id,
    categoryName: row.category_name,
    statusId: row.status_id,
    statusName: row.status_name,
  }));
}

/**
 * Raw query result for time-off by country aggregation
 */
interface RawTimeOffByCountry {
  country_name: string;
  country_iso: string | null;
  total_days: number;
}

/**
 * Get aggregated time-off days by country for all team members under a supervisor
 * Uses a single SQL query with recursive CTE for efficiency
 * Filters by date range (startDate to endDate inclusive)
 */
export async function getTeamTimeOffByCountry(
  supervisorTeamMemberId: number,
  startDate?: Date,
  endDate?: Date
): Promise<TimeOffByCountryDTO[]> {
  const today = new Date();
  // Default to current year if no dates provided
  const effectiveStartDate = startDate ?? new Date(today.getFullYear(), 0, 1);
  const effectiveEndDate = endDate ?? new Date(today.getFullYear(), 11, 31);

  const results = await prisma.$queryRaw<RawTimeOffByCountry[]>`
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
      COALESCE(c.cou_name, 'Unknown') AS country_name,
      c.cou_iso AS country_iso,
      COALESCE(SUM(tof.tto_days), 0)::int AS total_days
    FROM ds.tbl_tms_time_off tof
    INNER JOIN team_hierarchy th ON tof.tms_id = th.team_member_id
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = tof.tms_id
    LEFT JOIN ds.tbl_countries c ON c.cou_id = tm.cou_id
    WHERE tof.sta_id <> 4
      AND tof.tto_stadat >= ${effectiveStartDate}
      AND tof.tto_stadat <= ${effectiveEndDate}
    GROUP BY c.cou_name, c.cou_iso
    ORDER BY total_days DESC
  `;

  return results.map((row) => ({
    country: row.country_name,
    countryIso: row.country_iso,
    days: Number(row.total_days),
  }));
}

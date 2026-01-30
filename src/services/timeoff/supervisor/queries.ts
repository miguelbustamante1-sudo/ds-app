/**
 * Supervisor Queries Service
 * Handles hierarchical team member lookups for supervisors
 */

import { prisma } from '../../../db/prisma';
import type { SupervisedTeamMemberDTO, ReportType } from '@shared/dto/SupervisedTeamMember';
import type { TimeOffByMonthDTO } from '@shared/dto/TimeOff';

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
      COALESCE(SUM(tof.tto_enddat - tof.tto_stadat), 0)::int AS total_days
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

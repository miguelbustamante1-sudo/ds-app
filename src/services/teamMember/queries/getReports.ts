/**
 * Canonical query for "team members under a supervisor".
 *
 * Owns the recursive CTE and active-project aggregation.
 * All feature-specific queries must call this function and apply
 * their own filtering in application code — never duplicate this CTE.
 */

import { prisma } from '../../../db/prisma';
import type { TeamMemberReportDTO, TeamMemberReportProjectDTO } from '@shared/dto/TeamMemberReport';
import type { ReportType } from '@shared/dto/SupervisedTeamMember';

interface RawTeamMemberReport {
  team_member_id: number;
  workday_id: string | null;
  team_member_names: string;
  team_member_surnames: string;
  team_member_known_as: string | null;
  team_member_seniority: string;
  team_member_end_date: Date | null;
  team_member_start_date: Date;
  primary_role_name: string | null;
  country_id: number | null;
  country_name: string | null;
  country_iso: string | null;
  country_currency_symbol: string | null;
  report_type: string;
  report_level: number;
  supervisor_assignment_start_date: Date;
  supervisor_assignment_end_date: Date | null;
  current_projects: Array<{
    projectId: number;
    projectName: string;
    projectAssignmentAllocation: number;
    projectAssignmentStartDate: string | null;
    projectAssignmentEndDate: string | null;
    clientName: string | null;
    clientContacts: string[] | null;
  }>;
}

/**
 * Returns all team members in the supervisor's reporting hierarchy along with
 * their currently active project assignments.
 *
 * @param supervisorId        - team member ID of the supervisor (req.user.teamMemberId)
 * @param includeFullHierarchy - true → recursive depth 10, false → direct reports only
 */
export async function getReports(
  supervisorId: number,
  includeFullHierarchy: boolean,
): Promise<TeamMemberReportDTO[]> {
  const today = new Date();
  // depth < 1 is always false, so no recursion occurs → direct reports only
  const depthLimit = includeFullHierarchy ? 10 : 1;

  const results = await prisma.$queryRaw<RawTeamMemberReport[]>`
    WITH RECURSIVE team_hierarchy AS (
      -- Base case: direct reports of the supervisor
      SELECT
        sa.tms_id         AS team_member_id,
        sa.txs_stadat     AS txs_stadat,
        sa.txs_enddat     AS txs_enddat,
        'Direct'::text    AS report_type,
        1                 AS depth
      FROM ds.tbl_tms_x_supervisor sa
      WHERE sa.sup_id = ${supervisorId}
        AND sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})

      UNION ALL

      -- Recursive case: indirect reports
      SELECT
        sa.tms_id          AS team_member_id,
        sa.txs_stadat      AS txs_stadat,
        sa.txs_enddat      AS txs_enddat,
        'Indirect'::text   AS report_type,
        th.depth + 1       AS depth
      FROM ds.tbl_tms_x_supervisor sa
      INNER JOIN team_hierarchy th ON sa.sup_id = th.team_member_id
      WHERE sa.txs_stadat <= ${today}
        AND (sa.txs_enddat IS NULL OR sa.txs_enddat >= ${today})
        AND th.depth < ${depthLimit}
    ),
    -- Resolve to shallowest relationship per team member
    -- (Direct takes priority over Indirect when a member appears at multiple depths)
    ranked_hierarchy AS (
      SELECT DISTINCT ON (team_member_id)
        team_member_id,
        txs_stadat,
        txs_enddat,
        report_type,
        depth
      FROM team_hierarchy
      ORDER BY team_member_id, depth ASC
    )
    SELECT
      tm.tms_id                                                         AS team_member_id,
      tm.wdid                                                           AS workday_id,
      tm.tms_names                                                      AS team_member_names,
      tm.tms_surnames                                                   AS team_member_surnames,
      tm.tms_known_as                                                   AS team_member_known_as,
      tm.tms_seniority                                                  AS team_member_seniority,
      tm.tms_enddat                                                     AS team_member_end_date,
      tm.tms_stadat                                                     AS team_member_start_date,
      r.rol_name                                                        AS primary_role_name,
      c.cou_id                                                          AS country_id,
      c.cou_name                                                        AS country_name,
      c.cou_iso                                                         AS country_iso,
      c.cou_currency_symbol                                             AS country_currency_symbol,
      rh.report_type,
      rh.depth                                                          AS report_level,
      rh.txs_stadat                                                     AS supervisor_assignment_start_date,
      rh.txs_enddat                                                     AS supervisor_assignment_end_date,
      COALESCE(
        json_agg(
          json_build_object(
            'projectId',                   p.pro_id,
            'projectName',                 p.pro_name,
            'projectAssignmentAllocation', tmp.tmp_allocation,
            'projectAssignmentStartDate',  tmp.tmp_start_date,
            'projectAssignmentEndDate',    tmp.tmp_end_date,
            'clientName',     cli.cli_name,
            'clientContacts', COALESCE(
              (SELECT json_agg(cc.cco_name ORDER BY cc.cco_id)
               FROM ds.cco_client_contact cc
               WHERE cc.cli_id = cli.cli_id AND cc.cco_active = true),
              '[]'::json
            )
          )
        ) FILTER (WHERE p.pro_id IS NOT NULL),
        '[]'::json
      )                                                                 AS current_projects
    FROM ranked_hierarchy rh
    INNER JOIN ds.tbl_team_members tm ON tm.tms_id = rh.team_member_id
    LEFT JOIN ds.tbl_roles r ON r.rol_id = tm.tms_primary_role
    LEFT JOIN ds.cou_countries c ON c.cou_id = tm.cou_id
    LEFT JOIN ds.tmp_team_member_project tmp
      ON  tmp.tms_id = tm.tms_id
      AND tmp.tmp_deleted = false
      AND (tmp.tmp_end_date IS NULL OR tmp.tmp_end_date >= CURRENT_DATE)
    LEFT JOIN ds.pro_projects p
      ON  p.pro_id = tmp.pro_id
      AND p.pro_active = true
    LEFT JOIN ds.cli_clients cli
      ON  cli.cli_id = p.cli_id
    GROUP BY
      tm.tms_id,
      tm.wdid,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as,
      tm.tms_seniority,
      tm.tms_enddat,
      tm.tms_stadat,
      r.rol_name,
      c.cou_id,
      c.cou_name,
      c.cou_iso,
      c.cou_currency_symbol,
      rh.report_type,
      rh.depth,
      rh.txs_stadat,
      rh.txs_enddat
    ORDER BY tm.tms_surnames, tm.tms_names
  `;

  return results.map((row): TeamMemberReportDTO => {
    const projects: TeamMemberReportProjectDTO[] = Array.isArray(row.current_projects)
      ? row.current_projects.map((p) => ({
          projectId: Number(p.projectId),
          projectName: p.projectName,
          projectAssignmentAllocation: Number(p.projectAssignmentAllocation),
          projectAssignmentStartDate: p.projectAssignmentStartDate ? new Date(p.projectAssignmentStartDate) : null,
          projectAssignmentEndDate: p.projectAssignmentEndDate ? new Date(p.projectAssignmentEndDate) : null,
          clientName: p.clientName ?? null,
          clientContacts: Array.isArray(p.clientContacts) ? p.clientContacts : [],
        }))
      : [];

    return {
      teamMemberId: Number(row.team_member_id),
      workdayId: row.workday_id,
      teamMemberNames: row.team_member_names,
      teamMemberSurnames: row.team_member_surnames,
      teamMemberKnownAs: row.team_member_known_as,
      teamMemberFullName: `${row.team_member_names} ${row.team_member_surnames}`,
      teamMemberSeniority: row.team_member_seniority,
      teamMemberEndDate: row.team_member_end_date,
      teamMemberStartDate: row.team_member_start_date,
      primaryRoleName: row.primary_role_name,
      countryId: row.country_id != null ? Number(row.country_id) : null,
      countryName: row.country_name,
      countryIso: row.country_iso,
      countryCurrencySymbol: row.country_currency_symbol,
      reportType: row.report_type as ReportType,
      reportLevel: Number(row.report_level),
      supervisorAssignmentStartDate: row.supervisor_assignment_start_date,
      supervisorAssignmentEndDate: row.supervisor_assignment_end_date,
      currentProjects: projects,
    };
  });
}

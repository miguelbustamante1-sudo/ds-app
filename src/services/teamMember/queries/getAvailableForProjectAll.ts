/**
 * BSA variant of getAvailableForProject.
 *
 * Returns ALL active team members (not scoped to any supervisor hierarchy)
 * that are available to be added to the given project.
 * Used when the logged-in user has the "bsa" role.
 *
 * Applies the same business filters as getAvailableForProject:
 *  - not already assigned to the target project
 *  - totalAllocation < 100
 *  - optionally matches name search string `q`
 */

import { prisma } from '../../../db/prisma';
import type { AvailableForProjectDTO } from '@shared/dto/TeamMemberReport';
import type { TeamMemberReportProjectDTO } from '@shared/dto/TeamMemberReport';

interface RawRow {
  team_member_id: number;
  workday_id: string | null;
  team_member_names: string;
  team_member_surnames: string;
  team_member_known_as: string | null;
  team_member_seniority: string;
  team_member_end_date: Date | null;
  primary_role_name: string | null;
  country_id: number | null;
  country_name: string | null;
  country_iso: string | null;
  country_currency_symbol: string | null;
  current_projects: Array<{
    projectId: number;
    projectName: string;
    projectAssignmentAllocation: number;
  }>;
}

export async function getAvailableForProjectAll(
  projectId: number,
  q?: string,
): Promise<AvailableForProjectDTO[]> {
  const results = await prisma.$queryRaw<RawRow[]>`
    SELECT
      tm.tms_id                                                         AS team_member_id,
      tm.wdid                                                           AS workday_id,
      tm.tms_names                                                      AS team_member_names,
      tm.tms_surnames                                                   AS team_member_surnames,
      tm.tms_known_as                                                   AS team_member_known_as,
      tm.tms_seniority                                                  AS team_member_seniority,
      tm.tms_enddat                                                     AS team_member_end_date,
      r.rol_name                                                        AS primary_role_name,
      c.cou_id                                                          AS country_id,
      c.cou_name                                                        AS country_name,
      c.cou_iso                                                         AS country_iso,
      c.cou_currency_symbol                                             AS country_currency_symbol,
      COALESCE(
        json_agg(
          json_build_object(
            'projectId',                   p.pro_id,
            'projectName',                 p.pro_name,
            'projectAssignmentAllocation', tmp.tmp_allocation
          )
        ) FILTER (WHERE p.pro_id IS NOT NULL),
        '[]'::json
      )                                                                 AS current_projects
    FROM ds.tbl_team_members tm
    LEFT JOIN ds.tbl_roles r ON r.rol_id = tm.tms_primary_role
    LEFT JOIN ds.cou_countries c ON c.cou_id = tm.cou_id
    LEFT JOIN ds.tmp_team_member_project tmp
      ON  tmp.tms_id = tm.tms_id
      AND tmp.tmp_deleted = false
      AND (tmp.tmp_end_date IS NULL OR tmp.tmp_end_date >= CURRENT_DATE)
    LEFT JOIN ds.pro_projects p
      ON  p.pro_id = tmp.pro_id
      AND p.pro_active = true
    WHERE (tm.tms_enddat IS NULL OR tm.tms_enddat >= CURRENT_DATE)
    GROUP BY
      tm.tms_id,
      tm.wdid,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as,
      tm.tms_seniority,
      tm.tms_enddat,
      r.rol_name,
      c.cou_id,
      c.cou_name,
      c.cou_iso,
      c.cou_currency_symbol
    ORDER BY tm.tms_surnames, tm.tms_names
  `;

  const withAllocation = results.map((row) => {
    const projects: TeamMemberReportProjectDTO[] = Array.isArray(row.current_projects)
      ? row.current_projects.map((p) => ({
          projectId: Number(p.projectId),
          projectName: p.projectName,
          projectAssignmentAllocation: Number(p.projectAssignmentAllocation),
        }))
      : [];

    const totalAllocation = projects.reduce((sum, p) => sum + p.projectAssignmentAllocation, 0);

    return {
      teamMemberId: Number(row.team_member_id),
      workdayId: row.workday_id,
      teamMemberNames: row.team_member_names,
      teamMemberSurnames: row.team_member_surnames,
      teamMemberKnownAs: row.team_member_known_as,
      teamMemberFullName: row.team_member_known_as
        ? `${row.team_member_known_as} ${row.team_member_surnames}`
        : `${row.team_member_names} ${row.team_member_surnames}`,
      teamMemberSeniority: row.team_member_seniority,
      teamMemberEndDate: row.team_member_end_date,
      primaryRoleName: row.primary_role_name,
      countryId: row.country_id != null ? Number(row.country_id) : null,
      countryName: row.country_name,
      countryIso: row.country_iso,
      countryCurrencySymbol: row.country_currency_symbol,
      // These fields are supervisor-hierarchy concepts; not applicable here
      reportType: 'Direct' as const,
      supervisorAssignmentStartDate: new Date(0),
      supervisorAssignmentEndDate: null,
      currentProjects: projects,
      totalAllocation,
      availableAllocation: 100 - totalAllocation,
    };
  });

  return withAllocation.filter((tm) => {
    if (tm.currentProjects.some((p) => p.projectId === projectId)) return false;
    if (tm.totalAllocation >= 100) return false;
    if (q) {
      const full = `${tm.teamMemberNames} ${tm.teamMemberSurnames}`.toLowerCase();
      if (!full.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

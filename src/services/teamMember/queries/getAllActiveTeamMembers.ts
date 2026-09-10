/**
 * Returns all currently active team members with their project assignments.
 * Used in place of getReports() when the caller has the TLTeam permission.
 *
 * Hierarchy fields (reportType, reportLevel, supervisorAssignment*) are set to
 * sentinel values because no supervisor relationship exists in this context.
 */

import { prisma } from '../../../db/prisma';
import type { TeamMemberReportDTO, TeamMemberReportProjectDTO } from '@shared/dto/TeamMemberReport';

interface RawActiveTeamMember {
  team_member_id: number;
  workday_id: string | null;
  team_member_names: string;
  team_member_surnames: string;
  team_member_known_as: string | null;
  team_member_seniority: string;
  team_member_end_date: Date | null;
  team_member_company_end_date: Date | null;
  team_member_start_date: Date;
  primary_role_name: string | null;
  country_id: number | null;
  country_name: string | null;
  country_iso: string | null;
  country_currency_symbol: string | null;
  current_projects: Array<{
    projectId: number;
    projectName: string;
    projectExternalId: string | null;
    projectAssignmentAllocation: number;
    projectAssignmentStartDate: string | null;
    projectAssignmentEndDate: string | null;
    clientName: string | null;
    clientContacts: string[] | null;
  }>;
}

export async function getAllActiveTeamMembers(): Promise<TeamMemberReportDTO[]> {
  const today = new Date();

  const results = await prisma.$queryRaw<RawActiveTeamMember[]>`
    SELECT
      tm.tms_id                                                         AS team_member_id,
      tm.wdid                                                           AS workday_id,
      tm.tms_names                                                      AS team_member_names,
      tm.tms_surnames                                                   AS team_member_surnames,
      tm.tms_known_as                                                   AS team_member_known_as,
      tm.tms_seniority                                                  AS team_member_seniority,
      tm.tms_enddat                                                     AS team_member_end_date,
      tm.tms_company_end_date                                          AS team_member_company_end_date,
      tm.tms_stadat                                                     AS team_member_start_date,
      r.pos_name                                                        AS primary_role_name,
      c.cou_id                                                          AS country_id,
      c.cou_name                                                        AS country_name,
      c.cou_iso                                                         AS country_iso,
      c.cou_currency_symbol                                             AS country_currency_symbol,
      COALESCE(
        json_agg(
          json_build_object(
            'projectId',                   p.pro_id,
            'projectName',                 p.pro_name,
            'projectExternalId',           p.pro_external_id,
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
    FROM ds.tbl_team_members tm
    LEFT JOIN ds.pos_positions r ON r.pos_id = tm.tms_primary_role
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
    WHERE tm.tms_enddat IS NULL OR tm.tms_enddat >= ${today}
    GROUP BY
      tm.tms_id,
      tm.wdid,
      tm.tms_names,
      tm.tms_surnames,
      tm.tms_known_as,
      tm.tms_seniority,
      tm.tms_enddat,
      tm.tms_company_end_date,
      tm.tms_stadat,
      r.pos_name,
      c.cou_id,
      c.cou_name,
      c.cou_iso,
      c.cou_currency_symbol
    ORDER BY tm.tms_surnames, tm.tms_names
  `;

  return results.map((row): TeamMemberReportDTO => {
    const projects: TeamMemberReportProjectDTO[] = Array.isArray(row.current_projects)
      ? row.current_projects.map((p) => ({
          projectId: Number(p.projectId),
          projectName: p.projectName,
          projectExternalId: p.projectExternalId ?? null,
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
      teamMemberCompanyEndDate: row.team_member_company_end_date,
      teamMemberStartDate: row.team_member_start_date,
      primaryRoleName: row.primary_role_name,
      countryId: row.country_id != null ? Number(row.country_id) : null,
      countryName: row.country_name,
      countryIso: row.country_iso,
      countryCurrencySymbol: row.country_currency_symbol,
      reportType: 'Direct',
      reportLevel: 0,
      supervisorAssignmentStartDate: row.team_member_start_date,
      supervisorAssignmentEndDate: null,
      currentProjects: projects,
    };
  });
}

export interface ActiveTeamMemberSummary {
  teamMemberId: number;
  workdayId: string | null;
  teamMemberNames: string;
  teamMemberSurnames: string;
}

export async function getActiveTeamMemberSummaries(): Promise<ActiveTeamMemberSummary[]> {
  const today = new Date();
  return prisma.teamMember.findMany({
    where: {
      teamMemberStartDate: { lte: today },
      OR: [{ teamMemberEndDate: null }, { teamMemberEndDate: { gte: today } }],
    },
    select: { teamMemberId: true, workdayId: true, teamMemberNames: true, teamMemberSurnames: true },
    orderBy: [{ teamMemberSurnames: 'asc' }, { teamMemberNames: 'asc' }],
  });
}

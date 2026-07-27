/**
 * Purpose-built wrapper for the Team-Lead "Team Management" screen (FR-011).
 * Calls the canonical getReports() to resolve hierarchy scope, then enriches
 * with the fields that screen needs (tier band, role, shift, active project
 * assignment's functional area / client contact, pending change request flag)
 * via a direct lookup — getReports() itself does not carry these fields.
 */

import { prisma } from '../../../db/prisma';
import { getReports } from '../../teamMember/queries/getReports';
import { getPendingChangeRequestTeamMemberIds } from '../../teamMemberChangeRequest/repository';
import type { MyTeamMemberForManagementDTO } from '@shared/dto/TeamManagement';

export async function getMyTeamForManagement(supervisorId: number): Promise<MyTeamMemberForManagementDTO[]> {
  const reports = await getReports(supervisorId, true);
  if (reports.length === 0) return [];

  const ids = reports.map((r) => r.teamMemberId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [members, pendingIds] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamMemberId: { in: ids } },
      include: {
        country: { select: { countryName: true } },
        tierBand: { select: { tierBandDescription: true } },
        primaryRole: { select: { posName: true } },
        shift: { select: { description: true } },
        projectAssignments: {
          where: {
            projectAssignmentDeleted: false,
            OR: [{ projectAssignmentEndDate: null }, { projectAssignmentEndDate: { gte: today } }],
          },
          select: {
            projectAssignmentId: true,
            functionalAreaId: true,
            functionalArea: { select: { Name: true } },
            clientContactId: true,
            clientContact: { select: { name: true } },
            project: { select: { projectName: true, clientId: true } },
          },
          orderBy: { projectAssignmentStartDate: 'desc' },
          take: 1,
        },
      },
    }),
    getPendingChangeRequestTeamMemberIds(ids),
  ]);

  const pendingSet = new Set(pendingIds);

  return members.map((m): MyTeamMemberForManagementDTO => {
    const assignment = m.projectAssignments[0] ?? null;
    return {
      teamMemberId: m.teamMemberId,
      teamMemberNames: m.teamMemberNames,
      teamMemberSurnames: m.teamMemberSurnames,
      teamMemberKnownAs: m.teamMemberKnownAs,
      teamMemberStartDate: m.teamMemberStartDate,
      teamMemberEndDate: m.teamMemberEndDate,
      countryName: m.country?.countryName ?? null,
      workdayId: m.workdayId,
      tierBandId: m.tierBandId,
      tierBandDescription: m.tierBand?.tierBandDescription ?? null,
      teamMemberPrimaryRole: m.teamMemberPrimaryRole,
      roleName: m.primaryRole?.posName ?? null,
      teamMemberFullLegalName: m.teamMemberFullLegalName,
      shiftId: m.shiftId,
      shiftDescription: m.shift?.description ?? null,
      activeAssignment: assignment
        ? {
            projectAssignmentId: assignment.projectAssignmentId,
            projectName: assignment.project.projectName,
            clientId: assignment.project.clientId,
            functionalAreaId: assignment.functionalAreaId,
            functionalAreaName: assignment.functionalArea?.Name ?? null,
            clientContactId: assignment.clientContactId,
            clientContactName: assignment.clientContact?.name ?? null,
          }
        : null,
      hasPendingChangeRequest: pendingSet.has(m.teamMemberId),
    };
  });
}

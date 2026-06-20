import { prisma } from './prisma';
import type { ProjectAssignment, Prisma } from '@prisma/client';
import type { BenchAvailableMemberDTO } from '@shared/dto';

export const TABLE = 'ds.tmp_team_member_project';

export async function ensureTeamMemberProjectsTableExists(): Promise<boolean> {
  try {
    await prisma.projectAssignment.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getAllTeamMemberProjects() {
  return await prisma.projectAssignment.findMany({
    include: {
      teamMember: true,
      project: { include: { client: { include: { contacts: true } } } },
      clientContact: true,
    },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function getTeamMemberProjectById(id: number): Promise<ProjectAssignment | null> {
  return await prisma.projectAssignment.findUnique({
    where: { projectAssignmentId: id },
  });
}

export async function getTeamMemberProjectsByTeamMember(
  teamMemberId: number,
  active?: boolean,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.projectAssignment.findMany({
    where: {
      teamMemberId,
      ...(active === true
        ? {
            OR: [
              { projectAssignmentEndDate: null },
              { projectAssignmentEndDate: { gte: today } },
            ],
          }
        : {}),
    },
    include: { project: { include: { client: { include: { contacts: true } } } }, clientContact: true },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function getTeamMemberProjectsByProject(projectId: number) {
  return await prisma.projectAssignment.findMany({
    where: { projectId },
    include: { teamMember: true, clientContact: true },
    orderBy: { projectAssignmentId: 'asc' },
  });
}

export async function createTeamMemberProject(
  payload: Prisma.ProjectAssignmentUncheckedCreateInput
): Promise<ProjectAssignment> {
  return await prisma.projectAssignment.create({
    data: payload,
  });
}

export async function updateTeamMemberProject(
  id: number,
  payload: Prisma.ProjectAssignmentUncheckedUpdateInput
): Promise<ProjectAssignment | null> {
  if (Object.keys(payload).length === 0) {
    return getTeamMemberProjectById(id);
  }

  return await prisma.projectAssignment.update({
    where: { projectAssignmentId: id },
    data: payload,
  });
}

export async function deleteTeamMemberProject(id: number): Promise<boolean> {
  try {
    await prisma.projectAssignment.delete({
      where: { projectAssignmentId: id },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getBenchAvailableMembers(): Promise<BenchAvailableMemberDTO[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type RawRow = {
    teamMemberId: number;
    teamMemberNames: string;
    teamMemberSurnames: string;
    teamMemberSeniority: string | null;
    totalAllocation: string;
  };

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      tms.tms_id        AS "teamMemberId",
      tms.tms_names     AS "teamMemberNames",
      tms.tms_surnames  AS "teamMemberSurnames",
      tms.tms_seniority AS "teamMemberSeniority",
      COALESCE(SUM(tmp.tmp_allocation), 0) AS "totalAllocation"
    FROM ds.tbl_team_members tms
    LEFT JOIN ds.tmp_team_member_project tmp ON (
      tmp.tms_id = tms.tms_id
      AND tmp.tmp_deleted = false
      AND COALESCE(tmp.tmp_end_date, '2050-12-31'::date) >= ${today}::date
    )
    WHERE (tms.tms_enddat IS NULL OR tms.tms_enddat > ${today}::date)
    GROUP BY tms.tms_id, tms.tms_names, tms.tms_surnames, tms.tms_seniority
    HAVING COALESCE(SUM(tmp.tmp_allocation), 0) < 100
    ORDER BY tms.tms_names, tms.tms_surnames
  `;

  return rows.map((r) => ({
    teamMemberId: r.teamMemberId,
    teamMemberNames: r.teamMemberNames,
    teamMemberSurnames: r.teamMemberSurnames,
    teamMemberSeniority: r.teamMemberSeniority,
    totalAllocation: Number(r.totalAllocation),
  }));
}

export async function bulkRemoveAssignments(
  ids: number[],
  lastBillableDate: Date,
  updatedBy: number | null,
): Promise<ProjectAssignment[]> {
  const now = new Date();
  return await prisma.$transaction(
    ids.map((id) =>
      prisma.projectAssignment.update({
        where: { projectAssignmentId: id },
        data: {
          projectAssignmentEndDate: lastBillableDate,
          projectAssignmentLastUpdatedBy: updatedBy,
          projectAssignmentLastUpdatedDate: now,
        },
      }),
    ),
  );
}

export async function bulkChangeRate(
  ids: number[],
  newBillRate: number,
  newBillRateCurrency: string,
  startDate: Date,
  createdBy: number | null,
): Promise<{ closed: ProjectAssignment; created: ProjectAssignment }[]> {
  const now = new Date();
  const closeEndDate = new Date(startDate);
  closeEndDate.setDate(closeEndDate.getDate() - 1);

  return await prisma.$transaction(async (tx) => {
    const results: { closed: ProjectAssignment; created: ProjectAssignment }[] = [];

    for (const id of ids) {
      const current = await tx.projectAssignment.findUnique({
        where: { projectAssignmentId: id },
      });
      if (!current) continue;

      const closed = await tx.projectAssignment.update({
        where: { projectAssignmentId: id },
        data: {
          projectAssignmentEndDate: closeEndDate,
          projectAssignmentLastUpdatedBy: createdBy,
          projectAssignmentLastUpdatedDate: now,
        },
      });

      const created = await tx.projectAssignment.create({
        data: {
          teamMemberId: current.teamMemberId,
          projectId: current.projectId,
          projectAssignmentStartDate: startDate,
          projectAssignmentEndDate: current.projectAssignmentEndDate,
          projectAssignmentBillRate: newBillRate,
          projectAssignmentBillRateCurrency: newBillRateCurrency,
          projectAssignmentAllocation: current.projectAssignmentAllocation,
          projectAssignmentCreatedBy: createdBy,
          projectAssignmentCreatedDate: now,
          projectAssignmentLastUpdatedBy: createdBy,
          projectAssignmentLastUpdatedDate: now,
          projectAssignmentDeleted: false,
          clientContactId: current.clientContactId,
          shiftId: current.shiftId,
        },
      });

      results.push({ closed, created });
    }

    return results;
  });
}

export async function closeAndCreateAssignment(
  currentId: number,
  closeEndDate: Date,
  newRecord: Prisma.ProjectAssignmentUncheckedCreateInput,
  updatedBy: number | null,
  updatedDate: Date,
): Promise<{ closed: ProjectAssignment; created: ProjectAssignment }> {
  return await prisma.$transaction(async (tx) => {
    const closed = await tx.projectAssignment.update({
      where: { projectAssignmentId: currentId },
      data: {
        projectAssignmentEndDate: closeEndDate,
        projectAssignmentLastUpdatedBy: updatedBy,
        projectAssignmentLastUpdatedDate: updatedDate,
      },
    });

    const created = await tx.projectAssignment.create({
      data: newRecord,
    });

    return { closed, created };
  });
}

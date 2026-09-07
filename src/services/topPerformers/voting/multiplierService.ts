import { prisma } from '../../../db/prisma';

async function isAdminVoter(voterTeamMemberId: number): Promise<boolean> {
  const now = new Date();
  const asSupervisor = await prisma.supervisorAssignment.findFirst({
    where: {
      supervisorId: voterTeamMemberId,
      supervisorAssignmentStartDate: { lte: now },
      OR: [{ supervisorAssignmentEndDate: null }, { supervisorAssignmentEndDate: { gte: now } }],
    },
    select: { supervisorAssignmentId: true },
  });
  return !!asSupervisor;
}

// Walk the nominee's upward supervisor chain — caps at 10 levels.
async function isInDirectHierarchy(
  voterTeamMemberId: number,
  nomineeTeamMemberId: number
): Promise<boolean> {
  const now = new Date();
  let currentId = nomineeTeamMemberId;

  for (let depth = 0; depth < 10; depth++) {
    const assignment = await prisma.supervisorAssignment.findFirst({
      where: {
        teamMemberId: currentId,
        supervisorAssignmentStartDate: { lte: now },
        OR: [{ supervisorAssignmentEndDate: null }, { supervisorAssignmentEndDate: { gte: now } }],
      },
      select: { supervisorId: true },
    });

    if (!assignment?.supervisorId) break;
    if (assignment.supervisorId === voterTeamMemberId) return true;
    currentId = assignment.supervisorId;
  }

  return false;
}

async function getActiveLobId(teamMemberId: number): Promise<number | null> {
  const now = new Date();

  const proj = await prisma.projectAssignment.findFirst({
    where: {
      teamMemberId,
      projectAssignmentStartDate: { lte: now },
      OR: [{ projectAssignmentEndDate: null }, { projectAssignmentEndDate: { gte: now } }],
      functionalAreaId: { not: null },
      projectAssignmentDeleted: false,
    },
    select: { functionalAreaId: true },
  });
  if (proj?.functionalAreaId) return proj.functionalAreaId;

  const bench = await prisma.bench.findFirst({
    where: {
      teamMemberId,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { functionalAreaId: true },
  });
  return bench?.functionalAreaId ?? null;
}

export async function resolveMultiplier(
  voterTeamMemberId: number,
  nomineeTeamMemberId: number
): Promise<{ multiplier: number; reason: string }> {
  const isAdmin = await isAdminVoter(voterTeamMemberId);

  if (isAdmin) {
    // Admin path: hierarchy check only — LOB is irrelevant (FLAG-01)
    const inChain = await isInDirectHierarchy(voterTeamMemberId, nomineeTeamMemberId);
    if (inChain) {
      return { multiplier: 0.7, reason: 'admin_in_direct_hierarchy' };
    }
    return { multiplier: 1.5, reason: 'admin_outside_hierarchy' };
  }

  // Non-admin path: LOB comparison (FLAG-04)
  const voterLob = await getActiveLobId(voterTeamMemberId);
  const nomineeLob = await getActiveLobId(nomineeTeamMemberId);
  const sameLob = voterLob !== null && nomineeLob !== null && voterLob === nomineeLob;

  if (sameLob) {
    return { multiplier: 0.7, reason: 'non_admin_same_lob' };
  }
  return { multiplier: 1.0, reason: 'non_admin_different_lob' };
}

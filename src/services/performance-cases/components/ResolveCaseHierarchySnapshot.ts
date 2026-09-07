import { getSupervisorChain } from '../../teamMember/queries/getSupervisorChain';

export interface CaseHierarchySnapshot {
  omId: number | null;
  agmId: number | null;
}

export async function resolveCaseHierarchySnapshot(teamLeaderId: number): Promise<CaseHierarchySnapshot> {
  const chain = await getSupervisorChain(teamLeaderId);
  return {
    omId: chain[0]?.teamMemberId ?? null,
    agmId: chain[1]?.teamMemberId ?? null,
  };
}

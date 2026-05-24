import { Prisma } from '@prisma/client';

interface JoinEvaluationResult {
  shouldActivate: boolean;
}

const TERMINAL_STATES = new Set(['SUCCESS', 'FAILED', 'OVERRIDDEN']);

export async function evaluateJoinCondition(
  tx: Prisma.TransactionClient,
  candidateWitId: string,
  winId: string,
): Promise<JoinEvaluationResult> {
  const dependencies = await tx.widWorkflowInstanceTaskDependency.findMany({
    where: { witSuccessorId: candidateWitId },
  });

  // No predecessors — always activate
  if (dependencies.length === 0) {
    return { shouldActivate: true };
  }

  // Only PARALLEL_JOIN deps require evaluation
  const parallelJoinDeps = dependencies.filter(
    (d) => d.dependencyType === 'PARALLEL_JOIN',
  );

  if (parallelJoinDeps.length === 0) {
    return { shouldActivate: true };
  }

  // Group required parallel dependencies by joinGroupCode
  const groups = new Map<string | null, typeof parallelJoinDeps>();
  for (const dep of parallelJoinDeps) {
    if (!dep.isRequired) continue;
    const key = dep.joinGroupCode;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    // Safe: groups.set(key, []) was called unconditionally two lines above in this same iteration.
    const group = groups.get(key);
    if (group !== undefined) group.push(dep);
  }

  // For each required group, check that all predecessors are in a terminal state
  for (const [, groupDeps] of groups) {
    for (const dep of groupDeps) {
      const predecessor = await tx.witWorkflowInstanceTask.findUnique({
        where: { witId: dep.witPredecessorId },
        select: { state: true },
      });

      if (!predecessor || !TERMINAL_STATES.has(predecessor.state)) {
        return { shouldActivate: false };
      }
    }
  }

  return { shouldActivate: true };
}

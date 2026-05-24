import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

interface CompletedTaskRef {
  witId: string;
  winId: string;
  wtkId: string | null;
  outcomeCode: string | null;
}

interface RoutingResult {
  nextWitIds: string[];
  routeFound: boolean;
}

export async function runRoutingEngine(
  tx: Prisma.TransactionClient,
  completedTask: CompletedTaskRef,
): Promise<RoutingResult> {
  // If there is no template link, routing is not possible
  if (completedTask.wtkId === null) {
    return { nextWitIds: [], routeFound: false };
  }

  const routes = await tx.wtrWorkflowTemplateRoute.findMany({
    where: { wtkFromId: completedTask.wtkId },
    include: { outcome: true },
    orderBy: { routeOrder: 'asc' },
  });

  // Find the first matching route
  let matchedRoute: (typeof routes)[number] | undefined;

  for (const route of routes) {
    if (route.conditionType === 'NONE') {
      matchedRoute = route;
      break;
    }
    if (
      route.conditionType === 'OUTCOME_ONLY' &&
      route.outcome?.code === completedTask.outcomeCode
    ) {
      matchedRoute = route;
      break;
    }
  }

  if (!matchedRoute) {
    return { nextWitIds: [], routeFound: false };
  }

  // Resolve the target instance task
  const targetTask = await tx.witWorkflowInstanceTask.findFirst({
    where: {
      winId: completedTask.winId,
      wtkId: matchedRoute.wtkToId,
    },
    select: { witId: true },
  });

  if (!targetTask) {
    throw new AppError(
      'Routing integrity error: target task not found in instance',
      500,
    );
  }

  // Write WAL log inside transaction
  await tx.walWorkflowAuditLog.create({
    data: {
      winId: completedTask.winId,
      witId: completedTask.witId,
      eventType: 'ROUTE_SELECTED',
      performedBy: null,
    },
  });

  return { nextWitIds: [targetTask.witId], routeFound: true };
}

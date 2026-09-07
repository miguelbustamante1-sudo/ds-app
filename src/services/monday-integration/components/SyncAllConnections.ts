import { prisma } from '../../../db/prisma';
import { syncConnection } from './SyncConnection';

export async function syncAllConnections(): Promise<void> {
  const activeConnections = await prisma.mondayConnection.findMany({
    where: { mcdIsActive: true },
    select: { mcdId: true, mcdName: true },
  });

  for (const connection of activeConnections) {
    try {
      await syncConnection(connection.mcdId);
    } catch (err: unknown) {
      console.error(
        `[MondayIntegration] Sync failed for connection ${connection.mcdId} (${connection.mcdName}):`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

import { createConnection } from './components/CreateConnection';
import { updateConnection } from './components/UpdateConnection';
import { deleteConnection } from './components/DeleteConnection';
import { getConnections, getConnectionById } from './components/GetConnections';
import { testMondayConnection } from './components/TestMondayConnection';
import { listMondayBoardColumns } from './components/ListMondayBoardColumns';
import { syncConnection } from './components/SyncConnection';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import type {
  CreateMondayConnectionDTO,
  UpdateMondayConnectionDTO,
  MondayConnectionDTO,
} from '@shared/dto';

const CONNECTION_TABLE = 'ds.mcd_monday_conn_data';

function connectionToAuditRecord(dto: MondayConnectionDTO): Record<string, unknown> {
  return {
    mcdId: dto.mcdId,
    mcdName: dto.mcdName,
    mcdApiKeyMasked: dto.mcdApiKeyMasked,
    mcdBoardId: dto.mcdBoardId,
    mcdBoardName: dto.mcdBoardName,
    mcdFieldMapping: dto.mcdFieldMapping,
    mcdIsActive: dto.mcdIsActive,
  };
}

async function orchestrateCreate(
  input: CreateMondayConnectionDTO,
  createdBy: number,
  createdByEmail: string,
): Promise<MondayConnectionDTO> {
  const connection = await createConnection(input, createdBy);
  await auditOrchestrator.log({
    entityName: CONNECTION_TABLE,
    entityId: String(connection.mcdId),
    createdBy: createdByEmail,
    oldValues: null,
    newValues: connectionToAuditRecord(connection),
    comment: 'Monday connection created',
  });
  return connection;
}

async function orchestrateUpdate(
  mcdId: number,
  input: UpdateMondayConnectionDTO,
  updatedBy: number,
  updatedByEmail: string,
): Promise<MondayConnectionDTO> {
  const before = await getConnectionById(mcdId);
  const after = await updateConnection(mcdId, input, updatedBy);
  await auditOrchestrator.log({
    entityName: CONNECTION_TABLE,
    entityId: String(mcdId),
    createdBy: updatedByEmail,
    oldValues: connectionToAuditRecord(before),
    newValues: connectionToAuditRecord(after),
    comment: 'Monday connection updated',
  });
  return after;
}

async function orchestrateDelete(mcdId: number, deletedByEmail: string): Promise<void> {
  const deleted = await deleteConnection(mcdId);
  await auditOrchestrator.log({
    entityName: CONNECTION_TABLE,
    entityId: String(mcdId),
    createdBy: deletedByEmail,
    oldValues: connectionToAuditRecord(deleted),
    newValues: null,
    comment: 'Monday connection deleted',
  });
}

export const mondayIntegrationOrchestrator = {
  createConnection: orchestrateCreate,
  updateConnection: orchestrateUpdate,
  deleteConnection: orchestrateDelete,
  getConnections,
  getConnectionById,
  testMondayConnection,
  listMondayBoardColumns,
  syncConnection,
};

import { ProcedureCatalog } from './components/ProcedureCatalog';
import { ProcedureNameGuard } from './components/ProcedureNameGuard';
import { ProcedureExecutor } from './components/ProcedureExecutor';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import pool from '../../db/pool';
import * as dbLayer from '../../db/storedProcedures';
import type {
  StoredProcedureDTO,
  StoredProcedureSummaryDTO,
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
  ExecuteStoredProcedureDTO,
  ExecuteStoredProcedureResponseDTO,
} from '@shared/dto/StoredProcedure';

export class StoredProcedureOrchestrator {
  private readonly catalog: ProcedureCatalog;
  private readonly executor: ProcedureExecutor;

  constructor() {
    this.catalog = new ProcedureCatalog(pool);
    this.executor = new ProcedureExecutor(pool);
  }

  async listActive(): Promise<StoredProcedureSummaryDTO[]> {
    return dbLayer.listActiveProcedures();
  }

  async listAll(): Promise<StoredProcedureDTO[]> {
    return dbLayer.listAllProcedures();
  }

  async getById(spId: number): Promise<StoredProcedureDTO | null> {
    return dbLayer.getProcedureById(spId);
  }

  async getSignature(spId: number) {
    const proc = await this.getById(spId);
    if (!proc) throw new AppError('Procedure not found', 404);

    ProcedureNameGuard.validate(proc.spSchema, proc.spName);
    return this.catalog.getSignature(proc.spSchema, proc.spName);
  }

  async register(
    data: CreateStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<StoredProcedureDTO> {
    ProcedureNameGuard.validate(data.spSchema, data.spName);
    await this.catalog.getSignature(data.spSchema, data.spName);

    const created = await dbLayer.createProcedure(
      {
        spSchema: data.spSchema,
        spName: data.spName,
        spLabel: data.spLabel,
        spDescription: data.spDescription || null,
        spActive: true,
      },
      dsUserId,
    );

    await auditOrchestrator.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(created.spId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Stored procedure registered: ${data.spSchema}.${data.spName}`,
    });

    return created;
  }

  async update(
    spId: number,
    data: UpdateStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<StoredProcedureDTO> {
    const before = await this.getById(spId);
    if (!before) throw new AppError('Procedure not found', 404);

    const updated = await dbLayer.updateProcedure(spId, data, dsUserId);

    await auditOrchestrator.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(spId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Stored procedure updated: ${before.spSchema}.${before.spName}`,
    });

    return updated;
  }

  async softDelete(spId: number, dsUserId: number, userEmail: string): Promise<StoredProcedureDTO> {
    const before = await this.getById(spId);
    if (!before) throw new AppError('Procedure not found', 404);

    const updated = await dbLayer.softDeleteProcedure(spId, dsUserId);

    await auditOrchestrator.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(spId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Stored procedure deactivated: ${before.spSchema}.${before.spName}`,
    });

    return updated;
  }

  async execute(
    spId: number,
    body: ExecuteStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<ExecuteStoredProcedureResponseDTO> {
    const proc = await this.getById(spId);
    if (!proc) throw new AppError('Procedure not found', 404);

    ProcedureNameGuard.validate(proc.spSchema, proc.spName);
    const signature = await this.catalog.getSignature(proc.spSchema, proc.spName);

    const paramNames = signature.parameters.map((p) => p.parameterName);
    const result = await this.executor.execute(
      proc.spSchema,
      proc.spName,
      paramNames,
      body.params,
      signature.kind,
    );

    await auditOrchestrator.log({
      entityName: `${proc.spSchema}.${proc.spName}`,
      entityId: String(proc.spId),
      createdBy: userEmail,
      oldValues: null,
      newValues: {
        params: body.params,
        success: result.success,
        message: result.message,
      } as unknown as Record<string, unknown>,
      comment: `Stored procedure executed: ${proc.spSchema}.${proc.spName}`,
    });

    return result;
  }
}

export const storedProcedureOrchestrator = new StoredProcedureOrchestrator();

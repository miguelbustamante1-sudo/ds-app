import { Pool } from 'pg';
import { ProcedureCatalog } from './components/ProcedureCatalog';
import { ProcedureNameGuard } from './components/ProcedureNameGuard';
import { ProcedureExecutor } from './components/ProcedureExecutor';
import { auditOrchestrator } from '../audit/AuditOrchestrator';
import { AppError } from '../../errors/AppError';
import type {
  StoredProcedureDTO,
  StoredProcedureSummaryDTO,
  CreateStoredProcedureDTO,
  UpdateStoredProcedureDTO,
  ExecuteStoredProcedureDTO,
  ExecuteStoredProcedureResponseDTO,
} from '@shared/dto/StoredProcedure';

export class StoredProcedureOrchestrator {
  private catalog: ProcedureCatalog;
  private executor: ProcedureExecutor;

  constructor(
    private dbLayer: any,
    private pool: Pool,
    private audit: typeof auditOrchestrator,
  ) {
    this.catalog = new ProcedureCatalog(pool);
    this.executor = new ProcedureExecutor(pool);
  }

  /**
   * List all active registered procedures (for the run wizard)
   */
  async listActive(): Promise<StoredProcedureSummaryDTO[]> {
    return this.dbLayer.listActiveProcedures();
  }

  /**
   * List all registered procedures including inactive (for admin management)
   */
  async listAll(): Promise<StoredProcedureDTO[]> {
    return this.dbLayer.listAllProcedures();
  }

  /**
   * Get a single registered procedure by ID
   */
  async getById(spId: number): Promise<StoredProcedureDTO | null> {
    return this.dbLayer.getProcedureById(spId);
  }

  /**
   * Get the live parameter signature for a registered procedure
   */
  async getSignature(spId: number) {
    const proc = await this.getById(spId);
    if (!proc) throw new AppError('Procedure not found', 404);

    ProcedureNameGuard.validate(proc.spSchema, proc.spName);
    return this.catalog.getSignature(proc.spSchema, proc.spName);
  }

  /**
   * Register a new procedure: validate it exists in the DB, then create a registry entry
   */
  async register(
    data: CreateStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<StoredProcedureDTO> {
    // Validate schema and name
    ProcedureNameGuard.validate(data.spSchema, data.spName);

    // Confirm the procedure actually exists in Postgres
    await this.catalog.getSignature(data.spSchema, data.spName);

    // Create the registry entry
    const created = await this.dbLayer.createProcedure(
      {
        spSchema: data.spSchema,
        spName: data.spName,
        spLabel: data.spLabel,
        spDescription: data.spDescription || null,
        spActive: true,
      },
      dsUserId,
    );

    // Audit log
    await this.audit.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(created.spId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Stored procedure registered: ${data.spSchema}.${data.spName}`,
    });

    return created;
  }

  /**
   * Update a registered procedure's metadata
   */
  async update(
    spId: number,
    data: UpdateStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<StoredProcedureDTO> {
    const before = await this.getById(spId);
    if (!before) throw new AppError('Procedure not found', 404);

    const updated = await this.dbLayer.updateProcedure(spId, data, dsUserId);

    await this.audit.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(spId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: `Stored procedure updated: ${before.spSchema}.${before.spName}`,
    });

    return updated;
  }

  /**
   * Soft-delete a registered procedure
   */
  async softDelete(spId: number, dsUserId: number, userEmail: string): Promise<StoredProcedureDTO> {
    const before = await this.getById(spId);
    if (!before) throw new AppError('Procedure not found', 404);

    const updated = await this.dbLayer.softDeleteProcedure(spId, dsUserId);

    await this.audit.log({
      entityName: 'spr_procedure_definitions',
      entityId: String(spId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Stored procedure deactivated: ${before.spSchema}.${before.spName}`,
    });

    return updated;
  }

  /**
   * Execute a registered procedure
   */
  async execute(
    spId: number,
    body: ExecuteStoredProcedureDTO,
    dsUserId: number,
    userEmail: string,
  ): Promise<ExecuteStoredProcedureResponseDTO> {
    const proc = await this.getById(spId);
    if (!proc) throw new AppError('Procedure not found', 404);

    // Re-validate on each execution
    ProcedureNameGuard.validate(proc.spSchema, proc.spName);
    const signature = await this.catalog.getSignature(proc.spSchema, proc.spName);

    // Extract ordered parameter names from signature and pass parameter values
    const paramNames = signature.parameters.map((p) => p.parameterName);
    const result = await this.executor.execute(
      proc.spSchema,
      proc.spName,
      paramNames,
      body.params,
      signature.kind,
    );

    // Audit log the execution
    await this.audit.log({
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

const dbLayer = require('../../db/storedProcedures');
const pool = require('../../db/pool').default;

export const storedProcedureOrchestrator = new StoredProcedureOrchestrator(
  dbLayer,
  pool,
  auditOrchestrator,
);

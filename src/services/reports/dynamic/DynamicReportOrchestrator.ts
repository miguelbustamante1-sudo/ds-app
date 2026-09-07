import type { Response } from 'express';
import {
  listActiveReports,
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  softDeleteReport,
} from '../../../db/dynamicReports';
import { assertSqlSafe, extractParams, getColumnsFromSql } from './components/SqlSafetyGuard';
import { executeSql, streamCsvToResponse } from './components/SqlExecutor';
import { resolveOptions } from './components/OptionsResolver';
import { auditOrchestrator } from '../../audit';
import { can, type PermissionMap } from '../../../services/permissionResolver';
import { AppError } from '../../../errors/AppError';
import type {
  ReportDefinitionDTO,
  ReportDefinitionSummaryDTO,
  CreateReportDTO,
  UpdateReportDTO,
  ValidateResponseDTO,
  ExecuteRequestDTO,
  ExecuteResponseDTO,
} from '@shared/dto/DynamicReport';

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class DynamicReportOrchestrator {

  private assertReportPermission(
    reportPermission: string | null,
    permissions: PermissionMap,
  ): void {
    if (reportPermission && !can(permissions, reportPermission, 'read')) {
      throw new AppError('Insufficient permissions for this report', 403);
    }
  }

  async listActive(): Promise<ReportDefinitionSummaryDTO[]> {
    return listActiveReports();
  }

  async listAll(): Promise<ReportDefinitionSummaryDTO[]> {
    return getAllReports();
  }

  async getById(id: number, permissions: PermissionMap = {}): Promise<ReportDefinitionDTO | null> {
    const report = await getReportById(id);
    if (report) {
      this.assertReportPermission(report.reportPermission, permissions);
    }
    return report;
  }

  async validateSql(sql: string): Promise<ValidateResponseDTO> {
    try {
      assertSqlSafe(sql);
      const [columns, parameters] = await Promise.all([
        getColumnsFromSql(sql),
        Promise.resolve(extractParams(sql)),
      ]);
      return { valid: true, columns, parameters };
    } catch (err) {
      return {
        valid: false,
        columns: [],
        parameters: [],
        error: (err as Error).message,
      };
    }
  }

  async execute(
    reportId: number,
    body: ExecuteRequestDTO,
    permissions: PermissionMap = {},
  ): Promise<ExecuteResponseDTO> {
    const report = await getReportById(reportId);
    if (!report) throw new AppError('Report not found', 404);
    this.assertReportPermission(report.reportPermission, permissions);
    const page = Math.max(0, body.page ?? 0);
    const pageSize = Math.min(500, Math.max(1, body.pageSize ?? 25));
    return executeSql(reportId, body.params ?? {}, page, pageSize);
  }

  async download(
    reportId: number,
    body: ExecuteRequestDTO,
    permissions: PermissionMap = {},
  ): Promise<ExecuteResponseDTO> {
    const report = await getReportById(reportId);
    if (!report) throw new AppError('Report not found', 404);
    this.assertReportPermission(report.reportPermission, permissions);
    return executeSql(reportId, body.params ?? {}, 0, 50_000);
  }

  async streamCsv(
    reportId: number,
    body: ExecuteRequestDTO,
    res: Response,
    permissions: PermissionMap = {},
  ): Promise<void> {
    const report = await getReportById(reportId);
    if (!report) throw new AppError('Report not found', 404);
    this.assertReportPermission(report.reportPermission, permissions);
    return streamCsvToResponse(reportId, body.params ?? {}, res);
  }

  async getOptions(
    reportId: number,
    paramName: string,
    permissions: PermissionMap = {},
  ): Promise<{ value: string; label: string }[]> {
    const report = await getReportById(reportId);
    if (!report) throw new AppError('Report not found', 404);
    this.assertReportPermission(report.reportPermission, permissions);
    return resolveOptions(reportId, paramName);
  }

  async create(data: CreateReportDTO, userEmail: string): Promise<ReportDefinitionDTO> {
    const created = await createReport(data, userEmail);

    await auditOrchestrator.log({
      entityName: 'rpt_report_definitions',
      entityId: String(created.reportId),
      createdBy: userEmail,
      oldValues: null,
      newValues: created as unknown as Record<string, unknown>,
      comment: `Dynamic report created: ${created.reportName}`,
    });

    return created;
  }

  async update(id: number, data: UpdateReportDTO, userEmail: string): Promise<ReportDefinitionDTO> {
    const before = await getReportById(id);
    const after = await updateReport(id, data, userEmail);

    await auditOrchestrator.log({
      entityName: 'rpt_report_definitions',
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: after as unknown as Record<string, unknown>,
      comment: `Dynamic report updated: ${after.reportName}`,
    });

    return after;
  }

  async softDelete(id: number, userEmail: string): Promise<ReportDefinitionDTO> {
    const before = await getReportById(id);
    const after = await softDeleteReport(id, userEmail);

    await auditOrchestrator.log({
      entityName: 'rpt_report_definitions',
      entityId: String(id),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: null,
      comment: `Dynamic report deactivated: ${after.reportName}`,
    });

    return after;
  }
}

export const dynamicReportOrchestrator = new DynamicReportOrchestrator();

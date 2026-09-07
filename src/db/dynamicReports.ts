import { prisma } from './prisma';
import type {
  ReportDefinitionDTO,
  ReportDefinitionSummaryDTO,
  CreateReportDTO,
  UpdateReportDTO,
} from '@shared/dto/DynamicReport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSummary(r: {
  reportId: number;
  reportName: string;
  reportDescription: string | null;
  reportGroup: string;
  reportActive: boolean;
  reportPermission: string | null;
}): ReportDefinitionSummaryDTO {
  return {
    reportId: r.reportId,
    reportName: r.reportName,
    reportDescription: r.reportDescription,
    reportGroup: r.reportGroup,
    reportActive: r.reportActive,
    reportPermission: r.reportPermission,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listActiveReports(): Promise<ReportDefinitionSummaryDTO[]> {
  const rows = await prisma.reportDefinition.findMany({
    where: { reportActive: true },
    select: {
      reportId: true,
      reportName: true,
      reportDescription: true,
      reportGroup: true,
      reportActive: true,
      reportPermission: true,
    },
    orderBy: [{ reportGroup: 'asc' }, { reportName: 'asc' }],
  });
  return rows.map(toSummary);
}

export async function getAllReports(): Promise<ReportDefinitionSummaryDTO[]> {
  const rows = await prisma.reportDefinition.findMany({
    select: {
      reportId: true,
      reportName: true,
      reportDescription: true,
      reportGroup: true,
      reportActive: true,
      reportPermission: true,
    },
    orderBy: [{ reportGroup: 'asc' }, { reportName: 'asc' }],
  });
  return rows.map(toSummary);
}

export async function getReportById(id: number): Promise<ReportDefinitionDTO | null> {
  const row = await prisma.reportDefinition.findUnique({
    where: { reportId: id },
    include: {
      parameters: {
        orderBy: { parameterOrder: 'asc' },
      },
    },
  });
  if (!row) return null;
  return row as ReportDefinitionDTO;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createReport(
  data: CreateReportDTO,
  createdBy: string,
): Promise<ReportDefinitionDTO> {
  const created = await prisma.$transaction(async (tx) => {
    return tx.reportDefinition.create({
      data: {
        reportName: data.reportName,
        reportDescription: data.reportDescription ?? null,
        reportGroup: data.reportGroup,
        reportSqlQuery: data.reportSqlQuery,
        reportActive: data.reportActive,
        reportPermission: data.reportPermission ?? null,
        reportCreatedBy: createdBy,
        parameters: {
          create: data.parameters.map((p) => ({
            parameterName: p.parameterName,
            parameterLabel: p.parameterLabel,
            parameterType: p.parameterType,
            parameterRequired: p.parameterRequired,
            parameterDefault: p.parameterDefault ?? null,
            parameterOrder: p.parameterOrder,
            parameterOptions: p.parameterOptions ?? null,
          })),
        },
      },
      include: { parameters: { orderBy: { parameterOrder: 'asc' } } },
    });
  });
  return created as ReportDefinitionDTO;
}

export async function updateReport(
  id: number,
  data: UpdateReportDTO,
  updatedBy: string,
): Promise<ReportDefinitionDTO> {
  const updated = await prisma.$transaction(async (tx) => {
    // Delete existing parameters and recreate
    await tx.reportParameter.deleteMany({ where: { reportId: id } });

    return tx.reportDefinition.update({
      where: { reportId: id },
      data: {
        reportName: data.reportName,
        reportDescription: data.reportDescription ?? null,
        reportGroup: data.reportGroup,
        reportSqlQuery: data.reportSqlQuery,
        reportActive: data.reportActive,
        reportPermission: data.reportPermission ?? null,
        reportUpdatedBy: updatedBy,
        reportUpdatedAt: new Date(),
        parameters: {
          create: data.parameters.map((p) => ({
            parameterName: p.parameterName,
            parameterLabel: p.parameterLabel,
            parameterType: p.parameterType,
            parameterRequired: p.parameterRequired,
            parameterDefault: p.parameterDefault ?? null,
            parameterOrder: p.parameterOrder,
            parameterOptions: p.parameterOptions ?? null,
          })),
        },
      },
      include: { parameters: { orderBy: { parameterOrder: 'asc' } } },
    });
  });
  return updated as ReportDefinitionDTO;
}

export async function softDeleteReport(
  id: number,
  updatedBy: string,
): Promise<ReportDefinitionDTO> {
  const updated = await prisma.reportDefinition.update({
    where: { reportId: id },
    data: {
      reportActive: false,
      reportUpdatedBy: updatedBy,
      reportUpdatedAt: new Date(),
    },
    include: { parameters: { orderBy: { parameterOrder: 'asc' } } },
  });
  return updated as ReportDefinitionDTO;
}

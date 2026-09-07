import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

export interface CaseDocumentDTO {
  documentId: number;
  caseId: number;
  uploadId: number;
  documentLabel: string | null;
  createdDate: string;
}

export async function attachDocument(
  caseId: number,
  uploadId: number,
  documentLabel: string | undefined,
  actingUserId: number,
  actingUserEmail: string,
): Promise<CaseDocumentDTO> {
  const perfCase = await prisma.performanceCase.findUnique({ where: { caseId }, select: { caseId: true } });
  if (!perfCase) throw new AppError('Case not found', 404);

  const upload = await prisma.upload.findUnique({ where: { uploadId } });
  if (!upload) throw new AppError('Upload not found', 404);

  const created = await prisma.performanceCaseDocument.create({
    data: { caseId, uploadId, documentLabel: documentLabel?.trim() ?? null, createdBy: actingUserId },
  });

  await auditOrchestrator.log({
    entityName: 'pfc_case_documents',
    entityId: String(created.documentId),
    createdBy: actingUserEmail,
    oldValues: null,
    newValues: created as unknown as Record<string, unknown>,
    comment: `Document attached to performance case ${caseId}`,
  });

  return {
    documentId: created.documentId,
    caseId: created.caseId,
    uploadId: created.uploadId,
    documentLabel: created.documentLabel,
    createdDate: created.createdDate.toISOString(),
  };
}

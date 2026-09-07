import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';

export async function deleteDocument(
  caseId: number,
  documentId: number,
  actingUserEmail: string,
): Promise<void> {
  const document = await prisma.performanceCaseDocument.findUnique({ where: { documentId } });
  if (!document || document.caseId !== caseId) throw new AppError('Document not found', 404);

  await prisma.performanceCaseDocument.delete({ where: { documentId } });

  await auditOrchestrator.log({
    entityName: 'pfc_case_documents',
    entityId: String(documentId),
    createdBy: actingUserEmail,
    oldValues: document as unknown as Record<string, unknown>,
    newValues: null,
    comment: `Document removed from performance case ${caseId}`,
  });
}

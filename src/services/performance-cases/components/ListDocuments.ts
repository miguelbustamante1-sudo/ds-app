import { prisma } from '../../../db/prisma';
import type { CaseDocumentDTO } from './AttachDocument';

export async function listDocuments(caseId: number): Promise<(CaseDocumentDTO & { originalName: string })[]> {
  const rows = await prisma.performanceCaseDocument.findMany({
    where: { caseId },
    include: { upload: { select: { uploadOriginalName: true } } },
    orderBy: { createdDate: 'desc' },
  });
  return rows.map((row) => ({
    documentId: row.documentId,
    caseId: row.caseId,
    uploadId: row.uploadId,
    documentLabel: row.documentLabel,
    createdDate: row.createdDate.toISOString(),
    originalName: row.upload.uploadOriginalName,
  }));
}

import { prisma } from '../../db/prisma';

export interface DocChunkRow {
  dchDocName: string;
  dchSection: string | null;
  dchContent: string;
  similarity: number;
}

export interface DocSummary {
  dchDocId: string;
  dchDocName: string;
  chunkCount: number;
  createdAt: Date;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export async function upsertChunks(
  docId: string,
  docName: string,
  chunks: Array<{ section: string | null; content: string; embedding: number[] }>
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM ds.dch_doc_chunks WHERE dch_doc_id = $1`,
    docId
  );

  for (const chunk of chunks) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ds.dch_doc_chunks (dch_doc_id, dch_doc_name, dch_section, dch_content, dch_embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      docId,
      docName,
      chunk.section ?? null,
      chunk.content,
      toVectorLiteral(chunk.embedding)
    );
  }
}

export async function deleteByDocId(docId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM ds.dch_doc_chunks WHERE dch_doc_id = $1`,
    docId
  );
}

export async function similaritySearch(
  embedding: number[],
  topN: number = 5
): Promise<DocChunkRow[]> {
  return prisma.$queryRawUnsafe<DocChunkRow[]>(
    `SELECT
       dch_doc_name  AS "dchDocName",
       dch_section   AS "dchSection",
       dch_content   AS "dchContent",
       1 - (dch_embedding <=> $1::vector) AS similarity
     FROM ds.dch_doc_chunks
     ORDER BY dch_embedding <=> $1::vector
     LIMIT $2`,
    toVectorLiteral(embedding),
    topN
  );
}

export async function listDocuments(): Promise<DocSummary[]> {
  return prisma.$queryRawUnsafe<DocSummary[]>(
    `SELECT
       dch_doc_id       AS "dchDocId",
       dch_doc_name     AS "dchDocName",
       COUNT(*)::int    AS "chunkCount",
       MIN(dch_created_at) AS "createdAt"
     FROM ds.dch_doc_chunks
     GROUP BY dch_doc_id, dch_doc_name
     ORDER BY MIN(dch_created_at) DESC`
  );
}

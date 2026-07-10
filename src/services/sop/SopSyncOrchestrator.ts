import { uploadToGCS } from '../uploads/gcsClient';
import { extractText } from './DocumentParser';
import { chunkText } from './ChunkingService';
import { embedText } from './EmbeddingClient';
import { upsertChunks, deleteByDocId } from './SopRepository';

const GCS_SOP_PREFIX = 'sop/';

export interface IngestResult {
  docId: string;
  chunkCount: number;
}

export async function ingestDocument(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<IngestResult> {
  const docId = `${GCS_SOP_PREFIX}${originalName}`;

  await uploadToGCS(fileBuffer, docId, mimeType);

  const text = await extractText(fileBuffer, mimeType);
  const rawChunks = chunkText(text);

  const chunks = await Promise.all(
    rawChunks.map(async (chunk) => ({
      section: chunk.section,
      content: chunk.content,
      embedding: await embedText(chunk.content),
    }))
  );

  await upsertChunks(docId, originalName, chunks);

  return { docId, chunkCount: chunks.length };
}

export async function removeDocument(docId: string): Promise<void> {
  await deleteByDocId(docId);
}

import { uploadFile, attachFileToVectorStore, removeFileFromVectorStore } from './FuelixCopilotClient';

export interface IngestResult {
  docId: string;
}

export async function ingestDocument(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<IngestResult> {
  const { fileId } = await uploadFile(fileBuffer, originalName, mimeType);
  await attachFileToVectorStore(fileId);
  return { docId: fileId };
}

export async function removeDocument(docId: string): Promise<void> {
  // Removing a file from the vector store deletes the underlying Fuel iX
  // file object too — a separate /v1/files delete call 404s afterward.
  await removeFileFromVectorStore(docId);
}

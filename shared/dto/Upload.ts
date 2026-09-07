/**
 * DTOs for file uploads
 * Maps to ds.upl_uploads
 */

export interface UploadDTO {
  uploadId: number;
  uploadOriginalName: string;
  uploadMimeType: string;
  uploadSizeBytes: number;
  url: string;
}

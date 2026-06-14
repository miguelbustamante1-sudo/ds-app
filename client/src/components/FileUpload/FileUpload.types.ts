import type { UploadDTO } from '@shared/dto/Upload';

export type { UploadDTO as UploadedFile };

export interface FileUploadProps {
  maxFiles?: number;
  maxSizeBytes?: number;
  accept?: string[];
  value?: UploadDTO[];
  onChange?: (files: UploadDTO[]) => void;
  disabled?: boolean;
}

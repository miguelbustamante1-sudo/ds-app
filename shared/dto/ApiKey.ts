export interface ApiKeyDTO {
  apkId: number;
  apkName: string;
  apkIsActive: boolean;
  apkCreatedBy: number;
  apkCreatedDate: string;
  apkLastUsedDate: string | null;
  createdByUserName: string;
}

export interface IssueApiKeyDTO {
  apkName: string;
}

export interface IssueApiKeyResponseDTO {
  apkId: number;
  apkName: string;
  rawKey: string;
}

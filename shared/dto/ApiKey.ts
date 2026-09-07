import type { PermissionMap } from '../types/permissions';

export interface ApiKeyDTO {
  apkId: number;
  apkName: string;
  apkIsActive: boolean;
  apkCreatedBy: number;
  apkCreatedDate: string;
  apkLastUsedDate: string | null;
  apkPermissions: PermissionMap;
  createdByUserName: string;
}

export interface IssueApiKeyDTO {
  apkName: string;
  apkPermissions: PermissionMap;
}

export interface IssueApiKeyResponseDTO {
  apkId: number;
  apkName: string;
  rawKey: string;
}

export interface ApiPermissionCatalogDTO {
  apcId: number;
  apcResource: string;
  apcAction: 'read' | 'create' | 'delete';
  apcLabel: string;
}

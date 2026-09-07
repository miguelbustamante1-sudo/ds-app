import { apiGet, apiPost } from '@/lib/api';
import type { TpNominationDTO, TpNominationAdminDTO } from '@shared/dto/TpNomination';
import type { UploadDTO } from '@shared/dto/Upload';

export type { TpNominationDTO, TpNominationAdminDTO, UploadDTO };

export interface PeerNominationPayload {
  cycId: number;
  nomineeId: number;
  achievementText: string;
  quantitativeData?: string;
  valuesSelected?: string[];
  valuesDescription?: string;
  nominatorRelationship: 'SAME_TEAM' | 'OTHER_TEAM' | 'PROJECT';
  isDraft?: boolean;
}

export interface AdminNominationPayload extends PeerNominationPayload {
  adminExceedsRole: string;
  adminClientImpact: string;
  adminConfidenceLevel: number;
  metrics: Array<{ metricName: string; metricValue: string; metricBenchmark?: string }>;
  attachments?: UploadDTO[];
}

export interface CustomerNominationPayload {
  cycId: number;
  nomineeId: number;
  achievementText: string;
  customerChannel: string;
  feedbackDate: string;
  isDraft?: boolean;
  attachments?: UploadDTO[];
}

export const nominationsApi = {
  getByCycle: (cycId: number): Promise<TpNominationDTO[]> =>
    apiGet<TpNominationDTO[]>(`/api/top-performers/nominations?cycId=${cycId}`),

  getAdminView: (cycId: number): Promise<TpNominationAdminDTO[]> =>
    apiGet<TpNominationAdminDTO[]>(`/api/top-performers/nominations/admin-view?cycId=${cycId}`),

  createPeer: (payload: PeerNominationPayload): Promise<TpNominationDTO> =>
    apiPost<TpNominationDTO, PeerNominationPayload>('/api/top-performers/nominations/peer', payload),

  createAdmin: (payload: AdminNominationPayload): Promise<TpNominationDTO> =>
    apiPost<TpNominationDTO, AdminNominationPayload>('/api/top-performers/nominations/admin', payload),

  createCustomer: (payload: CustomerNominationPayload): Promise<TpNominationDTO> =>
    apiPost<TpNominationDTO, CustomerNominationPayload>('/api/top-performers/nominations/customer', payload),
};

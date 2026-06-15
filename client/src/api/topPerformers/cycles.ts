import { apiGet, apiPost, apiPatch, apiPut } from '@/lib/api';
import type { TpCycleDTO, TpCycleStatus, CreateTpCycleDTO, UpdateTpCycleStatusDTO, UpdateTpCycleDTO } from '@shared/dto/TopPerformersCycle';

export type { TpCycleDTO, TpCycleStatus, CreateTpCycleDTO, UpdateTpCycleStatusDTO, UpdateTpCycleDTO };

export const cyclesApi = {
  getAll: (): Promise<TpCycleDTO[]> =>
    apiGet<TpCycleDTO[]>('/api/top-performers/cycles'),

  getActive: (): Promise<TpCycleDTO | null> =>
    apiGet<TpCycleDTO | null>('/api/top-performers/cycles/active'),

  getCommitteeActive: (): Promise<TpCycleDTO | null> =>
    apiGet<TpCycleDTO | null>('/api/top-performers/cycles/committee-active'),

  create: (payload: CreateTpCycleDTO): Promise<TpCycleDTO> =>
    apiPost<TpCycleDTO, CreateTpCycleDTO>('/api/top-performers/cycles', payload),

  update: (cycId: number, payload: UpdateTpCycleDTO): Promise<TpCycleDTO> =>
    apiPut<TpCycleDTO, UpdateTpCycleDTO>(`/api/top-performers/cycles/${cycId}`, payload),

  updateStatus: (cycId: number, cycStatus: string): Promise<TpCycleDTO> =>
    apiPatch<TpCycleDTO, UpdateTpCycleStatusDTO>(
      `/api/top-performers/cycles/${cycId}/status`,
      { cycStatus }
    ),
};

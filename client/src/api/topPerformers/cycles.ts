import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { TpCycleDTO, CreateTpCycleDTO, UpdateTpCycleStatusDTO } from '@shared/dto/TopPerformersCycle';

export type { TpCycleDTO, CreateTpCycleDTO, UpdateTpCycleStatusDTO };

export const cyclesApi = {
  getAll: (): Promise<TpCycleDTO[]> =>
    apiGet<TpCycleDTO[]>('/api/top-performers/cycles'),

  getActive: (): Promise<TpCycleDTO | null> =>
    apiGet<TpCycleDTO | null>('/api/top-performers/cycles/active'),

  create: (payload: CreateTpCycleDTO): Promise<TpCycleDTO> =>
    apiPost<TpCycleDTO, CreateTpCycleDTO>('/api/top-performers/cycles', payload),

  updateStatus: (cycId: number, cycStatus: string): Promise<TpCycleDTO> =>
    apiPatch<TpCycleDTO, UpdateTpCycleStatusDTO>(
      `/api/top-performers/cycles/${cycId}/status`,
      { cycStatus }
    ),
};

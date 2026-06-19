import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardPoolDTO, CreateGiftCardPoolDTO, UpdateGiftCardPoolDTO } from '@shared/dto/GiftCardPool';

export type { GiftCardPoolDTO };

const BASE = '/api/giftcards/catalogs/pools';

export const getPools = () =>
  apiGet<GiftCardPoolDTO[]>(`${BASE}/`);

export const createPool = (data: CreateGiftCardPoolDTO) =>
  apiPost<GiftCardPoolDTO, CreateGiftCardPoolDTO>(`${BASE}/`, data);

export const updatePool = (id: number, data: UpdateGiftCardPoolDTO) =>
  apiPut<GiftCardPoolDTO, UpdateGiftCardPoolDTO>(`${BASE}/${id}`, data);

export const deactivatePool = (id: number) =>
  apiDelete(`${BASE}/${id}`);

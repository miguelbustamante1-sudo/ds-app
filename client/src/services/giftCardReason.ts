import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardReasonDTO, CreateGiftCardReasonDTO, UpdateGiftCardReasonDTO } from '@shared/dto/GiftCardReason';

export type { GiftCardReasonDTO };

const BASE = '/api/giftcards/catalogs/reasons';

export const getReasons = () =>
  apiGet<GiftCardReasonDTO[]>(`${BASE}/`);

export const createReason = (data: CreateGiftCardReasonDTO) =>
  apiPost<GiftCardReasonDTO, CreateGiftCardReasonDTO>(`${BASE}/`, data);

export const updateReason = (id: number, data: UpdateGiftCardReasonDTO) =>
  apiPut<GiftCardReasonDTO, UpdateGiftCardReasonDTO>(`${BASE}/${id}`, data);

export const deactivateReason = (id: number) =>
  apiDelete(`${BASE}/${id}`);

export const activateReason = (id: number) =>
  apiPut<GiftCardReasonDTO>(`${BASE}/${id}/activate`, {});

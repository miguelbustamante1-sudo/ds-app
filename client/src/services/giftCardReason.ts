import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardReasonDTO, CreateGiftCardReasonDTO, UpdateGiftCardReasonDTO } from '@shared/dto/GiftCardReason';

export type { GiftCardReasonDTO };

const BASE = '/api/giftcards/catalogs/reasons';

export const getReasons = () =>
  apiGet<GiftCardReasonDTO[]>(`${BASE}/`);

export const createReason = (data: CreateGiftCardReasonDTO) =>
  apiPost<{ data: GiftCardReasonDTO }, CreateGiftCardReasonDTO>(`${BASE}/`, data).then((r) => r.data);

export const updateReason = (id: number, data: UpdateGiftCardReasonDTO) =>
  apiPut<{ data: GiftCardReasonDTO }, UpdateGiftCardReasonDTO>(`${BASE}/${id}`, data).then((r) => r.data);

export const deactivateReason = (id: number) =>
  apiDelete(`${BASE}/${id}`);
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardTypeDTO, CreateGiftCardTypeDTO, UpdateGiftCardTypeDTO } from '@shared/dto/GiftCardType';

export type { GiftCardTypeDTO };

const BASE = '/api/giftcards/catalogs/card-types';

export const getCardTypes = () =>
  apiGet<GiftCardTypeDTO[]>(`${BASE}/`);
export const createCardType = (data: CreateGiftCardTypeDTO) =>
  apiPost<{ data: GiftCardTypeDTO }, CreateGiftCardTypeDTO>(`${BASE}/`, data).then((r) => r.data);

export const updateCardType = (id: number, data: UpdateGiftCardTypeDTO) =>
  apiPut<{ data: GiftCardTypeDTO }, UpdateGiftCardTypeDTO>(`${BASE}/${id}`, data).then((r) => r.data);

export const deactivateCardType = (id: number) =>
  apiDelete(`${BASE}/${id}`);
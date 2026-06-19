import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardTypeDTO, CreateGiftCardTypeDTO, UpdateGiftCardTypeDTO } from '@shared/dto/GiftCardType';

export type { GiftCardTypeDTO };

const BASE = '/api/giftcards/catalogs/card-types';

export const getCardTypes = () =>
  apiGet<GiftCardTypeDTO[]>(`${BASE}/`);

export const createCardType = (data: CreateGiftCardTypeDTO) =>
  apiPost<GiftCardTypeDTO, CreateGiftCardTypeDTO>(`${BASE}/`, data);

export const updateCardType = (id: number, data: UpdateGiftCardTypeDTO) =>
  apiPut<GiftCardTypeDTO, UpdateGiftCardTypeDTO>(`${BASE}/${id}`, data);

export const deactivateCardType = (id: number) =>
  apiDelete(`${BASE}/${id}`);

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { GiftCardValueDTO, CreateGiftCardValueDTO, UpdateGiftCardValueDTO } from '@shared/dto/GiftCardValue';

const BASE = '/api/giftcards/catalogs/card-values';

export const getCardValues = () =>
  apiGet<GiftCardValueDTO[]>(`${BASE}/`);

export const createCardValue = (data: CreateGiftCardValueDTO) =>
  apiPost<GiftCardValueDTO>(`${BASE}/`, data);

export const updateCardValue = (id: number, data: UpdateGiftCardValueDTO) =>
  apiPut<GiftCardValueDTO>(`${BASE}/${id}`, data);

export const deactivateCardValue = (id: number) =>
  apiDelete(`${BASE}/${id}`);
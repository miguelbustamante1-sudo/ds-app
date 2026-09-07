import { apiGet, apiPost } from '@/lib/api';
import type { GiftCardDocumentationDTO, CreateGiftCardDocumentationDTO } from '@shared/dto/GiftCardDocumentation';

const BASE = '/api/giftcards/documentation';

export const getDocumentations = () =>
  apiGet<GiftCardDocumentationDTO[]>(`${BASE}/`);

export const getDocumentationsByAssignment = (assignmentId: number) =>
  apiGet<GiftCardDocumentationDTO[]>(`${BASE}/assignment/${assignmentId}`);

export const createDocumentation = (data: CreateGiftCardDocumentationDTO) =>
  apiPost<GiftCardDocumentationDTO, CreateGiftCardDocumentationDTO>(`${BASE}/`, data);

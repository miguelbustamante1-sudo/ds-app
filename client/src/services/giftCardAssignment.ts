import { apiGet, apiPost } from '@/lib/api';
import type { GiftCardAssignmentDTO, CreateGiftCardAssignmentDTO } from '@shared/dto/GiftCardAssignment';

const BASE = '/api/giftcards/assignments';

export const getAssignments = () =>
  apiGet<GiftCardAssignmentDTO[]>(`${BASE}/`);

export const createAssignment = (data: CreateGiftCardAssignmentDTO) =>
  apiPost<GiftCardAssignmentDTO, CreateGiftCardAssignmentDTO>(`${BASE}/`, data);
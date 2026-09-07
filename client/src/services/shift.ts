import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import type { ShiftDTO, CreateShiftDTO, UpdateShiftDTO } from '@shared/dto/Shift';
import type { UpdateShiftDetailDTO } from '@shared/dto/ShiftDetail';

export type { ShiftDTO };

const BASE = '/api/shift';

export const getShifts = () =>
  apiGet<ShiftDTO[]>(`${BASE}/`);

export const getShift = (id: number) =>
  apiGet<ShiftDTO>(`${BASE}/${id}`);

export const createShift = (data: CreateShiftDTO) =>
  apiPost<ShiftDTO, CreateShiftDTO>(`${BASE}/`, data);

export const updateShift = (id: number, data: UpdateShiftDTO) =>
  apiPatch<ShiftDTO, UpdateShiftDTO>(`${BASE}/${id}`, data);

export const updateShiftDetail = (shiftId: number, detailId: number, data: UpdateShiftDetailDTO) =>
  apiPatch<unknown, UpdateShiftDetailDTO>(`${BASE}/${shiftId}/detail/${detailId}`, data);

export const deleteShift = (id: number) =>
  apiDelete(`${BASE}/${id}`);

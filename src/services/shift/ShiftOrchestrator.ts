import type { ShiftDTO } from '../../../shared/dto/Shift';
import type { ShiftDetailDTO } from '../../../shared/dto/ShiftDetail';
import {
  getAllShifts,
  getShiftById,
  createShift,
  deleteShift,
  updateShift,
  updateShiftDetail,
} from './repository';
import {
  validateCreateShift,
  validateUpdateShift,
  validateUpdateShiftDetail,
} from './components/ValidateShiftInput';

export class ShiftOrchestrator {
  async getAll(): Promise<ShiftDTO[]> {
    return getAllShifts();
  }

  async getById(id: number): Promise<ShiftDTO | null> {
    return getShiftById(id);
  }

  async create(raw: Record<string, unknown>): Promise<ShiftDTO> {
    const data = validateCreateShift(raw);
    return createShift(data);
  }

  async delete(id: number): Promise<boolean> {
    return deleteShift(id);
  }

  async update(id: number, raw: Record<string, unknown>): Promise<ShiftDTO | null> {
    const data = validateUpdateShift(raw);
    return updateShift(id, data);
  }

  async updateDetail(
    shiftId:  number,
    detailId: number,
    raw:      Record<string, unknown>,
  ): Promise<ShiftDetailDTO | null> {
    const data = validateUpdateShiftDetail(raw);
    return updateShiftDetail(shiftId, detailId, data);
  }
}

export const shiftOrchestrator = new ShiftOrchestrator();

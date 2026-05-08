import type { ShiftDetailDTO, CreateShiftDetailDTO } from './ShiftDetail';

export interface ShiftDTO {
  shiftId:        number;
  description:    string;
  totalWeekHours: number;
  lunchHours:     number;
  details:        ShiftDetailDTO[];
}

export interface CreateShiftDTO {
  description:    string;
  totalWeekHours: number;
  lunchHours?:    number;
  details?:       Omit<CreateShiftDetailDTO, 'shiftId'>[];
}

export interface UpdateShiftDTO {
  description?:    string;
  totalWeekHours?: number;
  lunchHours?:     number;
}

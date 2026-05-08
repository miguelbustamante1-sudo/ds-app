export interface ShiftDetailDTO {
  shiftDetailId: number;
  shiftId:       number;
  dayOfWeek:     number;
  startTime:     number;
  endTime:       number;
  workingHours:  number;
}

export interface CreateShiftDetailDTO {
  shiftId:      number;
  dayOfWeek:    number;
  startTime:    number;
  endTime:      number;
  workingHours: number;
}

export interface UpdateShiftDetailDTO {
  dayOfWeek?:    number;
  startTime?:    number;
  endTime?:      number;
  workingHours?: number;
}

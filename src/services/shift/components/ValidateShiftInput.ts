export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CreateShiftInput {
  description:    string;
  totalWeekHours: number;
  lunchHours:     number;
  details?: { dayOfWeek: number; startTime: number; endTime: number; workingHours: number }[];
}

export interface UpdateShiftInput {
  description?:    string;
  totalWeekHours?: number;
  lunchHours?:     number;
}

export interface UpdateShiftDetailInput {
  dayOfWeek?:    number;
  startTime?:    number;
  endTime?:      number;
  workingHours?: number;
}

export function validateCreateShift(raw: Record<string, unknown>): CreateShiftInput {
  const { description, totalWeekHours, lunchHours, details } = raw;

  if (typeof description !== 'string' || description.trim() === '') {
    throw new ValidationError('`description` is required and must be a non-empty string');
  }
  const parsedHours = Number(totalWeekHours);
  if (isNaN(parsedHours) || parsedHours < 0) {
    throw new ValidationError('`totalWeekHours` is required and must be a non-negative number');
  }
  const parsedLunch = lunchHours !== undefined ? Number(lunchHours) : 0;
  if (isNaN(parsedLunch) || parsedLunch < 0) {
    throw new ValidationError('`lunchHours` must be a non-negative number');
  }

  let parsedDetails: CreateShiftInput['details'];
  if (Array.isArray(details)) {
    for (const d of details) {
      if (
        typeof d !== 'object' || d === null ||
        typeof (d as Record<string, unknown>)['dayOfWeek']    !== 'number' ||
        typeof (d as Record<string, unknown>)['startTime']    !== 'number' ||
        typeof (d as Record<string, unknown>)['endTime']      !== 'number' ||
        typeof (d as Record<string, unknown>)['workingHours'] !== 'number'
      ) {
        throw new ValidationError('Each detail must have numeric fields: dayOfWeek, startTime, endTime, workingHours');
      }
    }
    parsedDetails = details as CreateShiftInput['details'];
  }

  return {
    description:    description.trim(),
    totalWeekHours: parsedHours,
    lunchHours:     parsedLunch,
    ...(parsedDetails !== undefined && { details: parsedDetails }),
  };
}

export function validateUpdateShift(raw: Record<string, unknown>): UpdateShiftInput {
  const { description, totalWeekHours, lunchHours } = raw;
  const data: UpdateShiftInput = {};

  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim() === '') {
      throw new ValidationError('`description` must be a non-empty string');
    }
    data.description = description.trim();
  }
  if (totalWeekHours !== undefined) {
    const h = Number(totalWeekHours);
    if (isNaN(h) || h < 0) {
      throw new ValidationError('`totalWeekHours` must be a non-negative number');
    }
    data.totalWeekHours = h;
  }
  if (lunchHours !== undefined) {
    const lh = Number(lunchHours);
    if (isNaN(lh) || lh < 0) {
      throw new ValidationError('`lunchHours` must be a non-negative number');
    }
    data.lunchHours = lh;
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided: description, totalWeekHours, lunchHours');
  }
  return data;
}

export function validateUpdateShiftDetail(raw: Record<string, unknown>): UpdateShiftDetailInput {
  const { dayOfWeek, startTime, endTime, workingHours } = raw;
  const data: UpdateShiftDetailInput = {};

  if (dayOfWeek    !== undefined) data.dayOfWeek    = Number(dayOfWeek);
  if (startTime    !== undefined) data.startTime    = Number(startTime);
  if (endTime      !== undefined) data.endTime      = Number(endTime);
  if (workingHours !== undefined) data.workingHours = Number(workingHours);

  for (const [key, val] of Object.entries(data)) {
    if (isNaN(val as number)) {
      throw new ValidationError(`\`${key}\` must be a number`);
    }
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError('At least one field must be provided: dayOfWeek, startTime, endTime, workingHours');
  }
  return data;
}

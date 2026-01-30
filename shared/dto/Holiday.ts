/**
 * DTOs for Holiday entity
 */

/**
 * HolidayDTO - Full holiday data returned to client
 */
export interface HolidayDTO {
  holidayId: number;
  countryId: number;
  holidayName: string;
  holidayDate: Date | string;
  holidayIsRecurring: boolean | null;
  holidayIsHalfDay: boolean;
  holidayCreatedAt: Date | string | null;
  holidayCreatedBy: string;
  holidayUpdatedAt: Date | string | null;
  holidayUpdatedBy: string | null;
  holidayIsActive: boolean | null;
  // Optional relation fields
  countryName?: string | null;
}

/**
 * CreateHolidayDTO - Data required to create a new holiday
 */
export interface CreateHolidayDTO {
  countryId: number;
  holidayName: string;
  holidayDate: Date | string;
  holidayIsRecurring?: boolean;
  holidayIsHalfDay?: boolean;
}

/**
 * UpdateHolidayDTO - Data allowed to be updated
 */
export interface UpdateHolidayDTO {
  countryId?: number;
  holidayName?: string;
  holidayDate?: Date | string;
  holidayIsRecurring?: boolean;
  holidayIsHalfDay?: boolean;
}

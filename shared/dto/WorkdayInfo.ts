/**
 * DTOs for WorkdayInfo entity (es.win_worday_info)
 */

export interface WorkdayInfoDTO {
  wdid: string;
  hireDate: Date | null;
  corporateEmail: string | null;
  personalEmail: string | null;
  allEmails: unknown;
  cellphone: string | null;
  homePhone: string | null;
  birthDate: string | null;
  parenthood: boolean | null;
  workStyle: string | null;
  gender: string | null;
  billingStatus: string | null;
  costCenterHierarchy: string | null;
  costCenterNames: string | null;
  directManager: string | null;
  vacation: number | null;
  personalDays: number | null;
  exceptionDaysUsed: number | null;
  exceptionDaysRemaining: number | null;
}

export interface CreateWorkdayInfoDTO {
  wdid: string;
  hireDate?: string | null;
  corporateEmail?: string | null;
  personalEmail?: string | null;
  allEmails?: unknown;
  cellphone?: string | null;
  homePhone?: string | null;
  birthDate?: string | null;
  parenthood?: boolean | null;
  workStyle?: string | null;
  gender?: string | null;
  billingStatus?: string | null;
  costCenterHierarchy?: string | null;
  costCenterNames?: string | null;
  directManager?: string | null;
  vacation?: number | null;
  personalDays?: number | null;
}

export interface UpdateWorkdayInfoDTO {
  hireDate?: string | null;
  corporateEmail?: string | null;
  personalEmail?: string | null;
  allEmails?: unknown;
  cellphone?: string | null;
  homePhone?: string | null;
  birthDate?: string | null;
  parenthood?: boolean | null;
  workStyle?: string | null;
  gender?: string | null;
  billingStatus?: string | null;
  costCenterHierarchy?: string | null;
  costCenterNames?: string | null;
  directManager?: string | null;
  vacation?: number | null;
  personalDays?: number | null;
}

export interface WorkdayInfoExceptionItemDTO {
  timeOffId: number;
  timeOffStartDate: string;
  timeOffEndDate: string;
  timeOffDays: number;
  categoryName: string;
  statusName: string;
}

export interface WorkdayInfoExceptionsDTO {
  anniversaryYearStart: string | null;
  anniversaryYearEnd: string | null;
  exceptionDaysUsed: number | null;
  exceptionDaysRemaining: number | null;
  exceptions: WorkdayInfoExceptionItemDTO[];
}

/**
 * Flag Intake — bulk-creates Standalone Tasks from rows of a recurring
 * compliance/tenure "flags" export (e.g. WD vs SFR audit mismatches, missing
 * 1:1s, missing personal info). Each row identifies the flagged team member
 * by Workday ID (embedded in `concatenate`) and the responsible BSA/TI
 * Supervisor by name — resolution of both happens server-side.
 */

export interface FlagIntakeRowDTO {
  category: string;
  /** Raw "{workdayId}-...-{report description}" string from the source export. */
  concatenate: string;
  /** Full name of the responsible team member — resolved to a teamMemberId server-side. */
  tiSupervisor: string;
  report: string;
  tenure?: string | null;
  om?: string | null;
  latestWaiverEta?: string | null;
  latestWaiverStatus?: string | null;
}

export interface SubmitFlagIntakeDTO {
  rows: FlagIntakeRowDTO[];
}

export type FlagIntakeRowStatus = 'created' | 'duplicate' | 'failed';

export interface FlagIntakeRowResultDTO {
  index: number;
  status: FlagIntakeRowStatus;
  taskId?: number;
  error?: string;
}

export interface SubmitFlagIntakeResponseDTO {
  results: FlagIntakeRowResultDTO[];
  insertedCount: number;
  duplicateCount: number;
  failedCount: number;
}

export interface WorkdayReconciliationRowDTO {
  workdayId: string | null;
  name: string | null;
  email: string | null;
  supervisorWorkdayId: string | null;
  supervisorName: string | null;
  date: string | null;
  workdayType: string | null;
  appType: string | null;
  workdayStatus: string | null;
  appStatus: string | null;
  reconciliationFlag: string | null;
  originalDates: string | null;
  country: string | null;
}

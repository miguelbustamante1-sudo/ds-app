/**
 * DTOs for the Time-Off External Feed endpoint (GET /api/time-offs/external/feed).
 * Returns active time-offs (statusId not in 4/5/6/7) overlapping a caller-given date range,
 * with team member identity fields joined in for external consumption.
 */

export interface TimeOffExternalFeedEntryDTO {
  workdayId: string;
  email: string | null;
  name: string;
  knownAs: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  statusShortName: string | null;
  type: string;
  typeShortName: string | null;
}

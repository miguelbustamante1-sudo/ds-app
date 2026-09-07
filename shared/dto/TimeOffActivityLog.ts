export interface TimeOffActivityLogEntryDTO {
  changeLogId:      number;
  timeOffId:        number;
  changeDate:       string;          // toc_created_at as ISO date string
  employeeFullName: string;          // teamMemberNames + ' ' + teamMemberSurnames (§13)
  countryName:      string;
  changedByName:    string | null;
  comment:          string | null;
  origStatus:       string | null;
  newStatus:        string | null;
  origCategory:     string | null;
  newCategory:      string | null;
  origStartDate:    string | null;
  newStartDate:     string | null;
  origEndDate:      string | null;
  newEndDate:       string | null;
  origDays:         number | null;
  newDays:          number | null;
  origActive:       'Yes' | 'No' | null;
  newActive:        'Yes' | 'No' | null;
  currentCategory:  string | null;
  currentStartDate: string | null;
  currentEndDate:   string | null;
}

export interface TimeOffActivityLogQueryDTO {
  scope:     'mine' | 'team';
  page?:     string;
  pageSize?: string;
}

export interface TimeOffActivityLogResponseDTO {
  data:     TimeOffActivityLogEntryDTO[];
  total:    number;
  page:     number;
  pageSize: number;
}

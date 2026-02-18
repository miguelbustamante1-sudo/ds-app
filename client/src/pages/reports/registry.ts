export interface ReportEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  group: string;
  permission?: string;
}

export const REPORTS_REGISTRY: ReportEntry[] = [
  {
    id: 'timeoff-change-log',
    title: 'Change Log',
    description: 'Audit trail of all time off record changes.',
    path: '/reports/time-off/change-log',
    group: 'Time Off',
    permission: 'Reports',
  },
  // Future reports are added here — no other files need to change.
];

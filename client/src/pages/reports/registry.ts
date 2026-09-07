export interface ReportEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  group: string;
  permission?: string;
  isDynamic?: boolean;
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
  {
    id: 'timeoff-upcoming-vacation',
    title: 'Upcoming Vacation',
    description: 'Approved time offs and holiday swaps for your team in the next N days.',
    path: '/reports/time-off/upcoming-vacation',
    group: 'Time Off',
    permission: 'Reports',
  },
  {
    id: 'timeoff-workday-reconciliation',
    title: 'Workday Reconciliation',
    description: 'Vacation days recorded in the application that are not yet reflected in Workday, starting in the next 45 days.',
    path: '/reports/time-off/workday-reconciliation',
    group: 'Time Off',
    permission: 'Reports',
  },
  {
    id: 'timeoff-gt-vacation-under-five-days',
    title: 'GT Vacation Under 5 Days',
    description: 'Active Guatemala time-off requests under 5 days that are currently ongoing or upcoming.',
    path: '/reports/time-off/gt-vacation-under-five-days',
    group: 'Time Off',
    permission: 'Reports',
  },
  {
    id: 'performance-cases',
    title: 'Performance Cases',
    description: 'Performance improvement cases across your reporting chain, filterable by date, tier, and status.',
    path: '/reports/performance-cases',
    group: 'Performance Management',
    permission: 'Reports',
  },
  // Future reports are added here — no other files need to change.
];

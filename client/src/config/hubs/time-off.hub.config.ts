import { HubConfig } from './hub.types';

export const timeOffHubConfig: HubConfig = {
  key: 'time-off',
  title: 'Time Off Management',
  subtitle: 'Review, approve, and manage time off requests across your team.',
  buttons: [
    {
      title: 'Supervisor Time Off',
      description: 'Create and manage time off on behalf of your direct reports.',
      path: '/supervisor-time-off',
      permission: 'SupervisorTimeOff',
    },
    {
      title: 'Team Holiday Swaps',
      description: 'Review and manage holiday swap requests from your team.',
      path: '/supervisor-holiday-swaps',
      permission: 'SupervisorHolidaySwaps',
    },
    {
      title: 'Time Off Review',
      description: 'Approve or reject pending time off requests from your team.',
      path: '/time-off-management',
      permission: 'TimeOffReview',
    },
    {
      title: 'Time Off Exception',
      description: 'Process time off exceptions for BSA-managed requests.',
      path: '/timeoff-exception',
      role: 'bsa',
      permission: 'TimeOffException',
    },
    {
      title: 'Holiday Swap Exception',
      description: 'Handle holiday swap exceptions that require BSA approval.',
      path: '/holiday-swap-exception',
      role: 'bsa',
      permission: 'HolidaySwapException',
    },
    {
      title: 'Supervisor Time Off V2',
      description: 'Team overview dashboard — vacation balances and time off status for all direct reports.',
      path: '/supervisor-time-off-v2',
      permission: 'SupervisorTimeOffV2',
    },
    {
      title: 'Comp Time — Supervisor',
      description: 'Review and manage compensatory time balances and requests across your team.',
      path: '/comp-time/supervisor',
    },
    {
      title: 'Approval Management',
      description: 'Multi-level approval queue for compensatory time requests requiring sign-off.',
      path: '/approval-management',
    },
  ],
};

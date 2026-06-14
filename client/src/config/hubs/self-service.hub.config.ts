import { HubConfig } from './hub.types';

export const selfServiceHubConfig: HubConfig = {
  key: 'self-service',
  title: 'Employee Self-Service',
  subtitle: 'Manage your time off, holiday swaps, and personal activity.',
  buttons: [
    {
      title: 'My Time Off',
      description: 'View and request your personal time off.',
      path: '/my-time-off',
      permission: 'MyTimeOff',
    },
    {
      title: 'Holiday Swaps',
      description: 'Request a swap for a public holiday.',
      path: '/holiday-swaps',
      permission: 'HolidaySwaps',
    },
    {
      title: 'Time Off Activity',
      description: 'Review the full history of your time off transactions.',
      path: '/timeoff-activity',
      permission: 'TimeOffActivity',
    },
    {
      title: 'Comp Time — Request',
      description: 'Submit a compensatory time request for approved extra hours worked.',
      path: '/compensatory-time/intake',
    },
    {
      title: 'Comp Time — Redeem',
      description: 'Use your earned compensatory time balance to request time off.',
      path: '/compensatory-time/usage',
    },
  ],
};

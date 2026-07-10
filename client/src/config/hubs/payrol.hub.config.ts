import { HubConfig } from './hub.types';

export const payrolHubConfig: HubConfig = {
  key: 'payrol',
  title: 'Payrol',
  subtitle: 'Manage payrol periods and bonus impacts for your team.',
  buttons: [
    {
      title: 'Bonus Impact',
      description: 'Register and track bonus deductions for your direct reports.',
      path: '/payrol/bonus-impact',
      permission: 'BonusImpact',
    },
    {
      title: 'Bonus Impact Admin',
      description: 'Full organization view of bonus impacts. Process impacts against payrol periods.',
      path: '/payrol/bonus-impact-admin',
      permission: 'BonusImpact',
      role: 'bsa',
    },
    {
      title: 'Payrol Management',
      description: 'Create and manage payrol periods.',
      path: '/payrol/payrol-management',
      permission: 'PayrolManagement',
      role: 'bsa',
    },
  ],
};

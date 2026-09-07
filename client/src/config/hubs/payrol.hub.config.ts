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
      title: 'Other Incomes',
      description: 'Submit and track other income entries for your team, and approve/reject entries you authorize.',
      path: '/payrol/other-incomes',
      permission: 'OtherIncomes',
    },
    {
      title: 'Other Incomes Admin',
      description: 'Full organization view of other income entries. Bulk import, bulk delete, and manage income types and authorizers.',
      path: '/payrol/other-incomes-admin',
      permission: 'PayrollAdmin',
      role: 'bsa',
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
    {
      title: 'Team Member Reimbursements',
      description: 'Register and track reimbursements paid to team members.',
      path: '/payrol/team-member-reimbursements',
      permission: 'PayrolManagement',
      role: 'bsa',
    },
    {
      title: 'Team Member On Call',
      description: 'Register and track on call payments made to team members.',
      path: '/payrol/team-member-oncall',
      permission: 'PayrolManagement',
      role: 'bsa',
    },
  ],
};

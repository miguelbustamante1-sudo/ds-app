import { HubConfig } from './hub.types';

export const phoneContractsHubConfig: HubConfig = {
  key: 'phone-contracts',
  title: 'Phone Contracts',
  subtitle: 'Manage corporate phone lines, assignments, and contract renewals.',
  buttons: [
    {
      title: 'Phone Contracts',
      description: 'View and manage corporate phone lines, their assignments, and renewal history.',
      path: '/phone-contracts',
      permission: 'PhoneContracts',
    },
  ],
};

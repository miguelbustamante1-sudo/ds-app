import { HubConfig } from './hub.types';

export const hiringHubConfig: HubConfig = {
  key: 'hiring',
  title: 'Talent Acquisition',
  subtitle: 'Manage open positions, endorsements, and the candidate pipeline.',
  buttons: [
    {
      title: 'Hiring',
      description: 'Manage open positions and the candidate pipeline.',
      path: '/hiring',
      role: 'bsa',
      permission: 'Hiring',
    },
    {
      title: 'Endorsements',
      description: 'Review and manage existing BSA endorsements. New endorsements are submitted through the Hiring wizard.',
      path: '/endorsements',
      role: 'bsa',
      permission: 'Endorsements',
    },
  ],
};

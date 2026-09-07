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
      description: 'Submit and review BSA endorsements for team members.',
      path: '/endorsements',
      role: 'bsa',
      permission: 'Endorsements',
    },
  ],
};

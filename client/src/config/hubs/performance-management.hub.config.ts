import { HubConfig } from './hub.types';

export const performanceManagementHubConfig: HubConfig = {
  key: 'performance-management',
  title: 'Performance Management',
  subtitle: 'Manage performance improvement cases through their full lifecycle.',
  buttons: [
    {
      title: 'Performance Cases',
      description: 'Create and progress performance improvement cases for team members.',
      path: '/performance-cases',
      permission: 'PerformanceCases',
    },
    {
      title: 'Manager View',
      description: 'Cases in your reporting chain, with at-risk and ETA-overdue flags.',
      path: '/performance-cases/manager-view',
      permission: 'PerformanceCases',
    },
    {
      title: 'Portfolio Summary',
      description: 'Rollup of cases by tier and phase, at-risk cases, and TL strike counts.',
      path: '/performance-cases/portfolio-summary',
      permission: 'PerformanceCases',
    },
    {
      title: 'HR Partner View',
      description: 'Cases assigned to you as HR Partner, plus unassigned escalated closures.',
      path: '/performance-cases/hr-partner-view',
      permission: 'PerformanceCases',
    },
    {
      title: 'Performance Cases Report',
      description: 'Reporting view of performance cases (opens the Reports area).',
      path: '/reports/performance-cases',
      permission: 'PerformanceCases',
    },
  ],
};

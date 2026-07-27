import { HubConfig } from './hub.types';

export const communicationsHubConfig: HubConfig = {
  key: 'communications',
  title: 'Communications & Awareness',
  subtitle: 'Stay connected with your team, announcements, and pending action items.',
  buttons: [
    {
      title: 'My Team',
      description: 'View your team members and their key information.',
      path: '/my-team',
      permission: 'MyTeam',
    },
    {
      title: 'Announcements',
      description: 'View and manage company-wide announcements.',
      path: '/announcements',
      permission: 'Notifications',
    },
    {
      title: 'Notification Center',
      description: 'Review all your personal notifications in one place.',
      path: '/notification-center',
      permission: 'NotificationCenter',
    },
    {
      title: 'Action Items',
      description: 'Review and act on requests waiting for your attention.',
      path: '/my-team/pending',
      permission: 'PendingRequests',
    },
    {
      title: 'Team Management',
      description: "Edit your reports' details and submit sensitive changes for approval.",
      path: '/team-management',
      permission: 'MyTeam',
    },
    {
      title: 'Change Approvals',
      description: 'Review and approve or reject sensitive team-member change requests.',
      path: '/team-management/approvals',
      permission: 'MyTeam',
    },
    {
      title: 'My Tasks',
      description: 'View and act on workflow tasks assigned to you.',
      path: '/my-tasks',
    },
    {
      title: 'Workflow Templates',
      description: 'Create and manage reusable workflow templates for automated processes.',
      path: '/admin/workflow/templates',
      role: 'admin',
    },
    {
      title: 'Workflow Instances',
      description: 'Monitor active and completed workflow executions across the organization.',
      path: '/admin/workflow/instances',
      role: 'admin',
    },
  ],
};

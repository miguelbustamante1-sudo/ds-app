import { HubConfig } from './hub.types';

export const projectManagementHubConfig: HubConfig = {
  key: 'project-management',
  title: 'Project & Resource Allocation',
  subtitle: 'Manage project assignments, bench moves, and resource allocation.',
  buttons: [
    {
      title: 'Project Assignments',
      description: 'View and manage project allocation across team members.',
      path: '/project-assignments',
      permission: 'ProjectAssignments',
    },
    {
      title: 'Bench Move',
      description: 'Create and manage bench assignments for team members.',
      path: '/bench-move',
      permission: 'BenchMove',
    },
    {
      title: 'End Bench',
      description: 'Close an active bench assignment and return a member to billing.',
      path: '/end-bench',
      permission: 'BenchRemove',
    },
    {
      title: 'Clients',
      description: 'View and manage client records.',
      path: '/maintenance/clients',
      permission: 'Clients',
    },
    {
      title: 'Client Contacts',
      description: 'Manage contacts associated with each client.',
      path: '/maintenance/client-contacts',
      permission: 'Clients',
    },
  ],
};

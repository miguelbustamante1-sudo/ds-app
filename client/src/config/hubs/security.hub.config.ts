import { HubConfig } from './hub.types';

export const securityHubConfig: HubConfig = {
  key: 'security',
  title: 'Security',
  subtitle: 'Manage roles, resources, and permission assignments.',
  buttons: [
    {
      title: 'Roles',
      description: 'Create and manage RBAC roles.',
      path: '/security/roles',
      permission: 'RBACRoles',
    },
    {
      title: 'Resources',
      description: 'Define and manage protected resources.',
      path: '/security/options',
      permission: 'RBACOptions',
    },
    {
      title: 'Permissions Matrix',
      description: 'Assign permissions to roles.',
      path: '/security/permissions',
      permission: 'RBACRolePermissions',
    },
    {
      title: 'Reports',
      description: 'Access Security and audit reports.',
      path: '/reports?module=security',
    },
  ],
};

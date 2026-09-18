import { HubConfig } from './hub.types';

export const governanceHubConfig: HubConfig = {
  key: 'governance',
  title: 'System Governance',
  subtitle: 'Manage access control and reference data configuration.',
  sections: [
    {
      title: 'Access Control',
      description: 'Manage roles, resources, and user permissions.',
      buttons: [
        {
          title: 'Roles',
          description: 'Create and manage role definitions for the application.',
          path: '/security/roles',
          role: 'admin',
          permission: 'RBACRoles',
        },
        {
          title: 'Resources',
          description: 'Define resources and options available for permission assignment.',
          path: '/security/options',
          role: 'admin',
          permission: 'RBACOptions',
        },
        {
          title: 'Permissions Matrix',
          description: 'Assign read, create, and delete permissions per role and resource.',
          path: '/security/permissions',
          role: 'admin',
          permission: 'RBACPermissions',
        },
      ],
    },
    {
      title: 'Master Data Maintenance',
      description: 'Configure system reference tables and lookup values.',
      buttons: [
        {
          title: 'Bonus Categories',
          description: 'Create and manage bonus category definitions.',
          path: '/maintenance/bonus-categories',
          permission: 'BonusCategories',
        },
        {
          title: 'Bonus Subcategories',
          description: 'Manage subcategories within each bonus category.',
          path: '/maintenance/bonus-subcategories',
          permission: 'BonusCategories',
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
        {
          title: 'Countries',
          description: 'Configure country records used across the system.',
          path: '/maintenance/countries',
          permission: 'Countries',
        },
        {
          title: 'Functional Areas',
          description: 'Define functional areas for team organization.',
          path: '/maintenance/functional-areas',
          permission: 'FunctionalAreas',
        },
        {
          title: 'Holidays',
          description: 'Manage public holidays by country and year.',
          path: '/maintenance/holidays',
          permission: 'Holidays',
        },
        {
          title: 'Projects',
          description: 'View and manage project records.',
          path: '/maintenance/projects',
          permission: 'Projects',
        },
        {
          title: 'Supervisor Assignments',
          description: 'Assign and review supervisor relationships.',
          path: '/maintenance/supervisor-assignments',
          permission: 'SupervisorAssignments',
        },
        {
          title: 'Supervisor Coverage',
          description: 'Manage temporary coverage arrangements between supervisors.',
          path: '/maintenance/supervisor-coverage',
          permission: 'SupervisorCoverage',
        },
        {
          title: 'Team Members',
          description: 'Manage team member profiles and settings.',
          path: '/maintenance/team-members',
          permission: 'TeamMembers',
        },
        {
          title: 'Tier Bands',
          description: 'Configure compensation tier band definitions.',
          path: '/maintenance/tier-bands',
          permission: 'TierBands',
        },
        {
          title: 'Time Off Statuses',
          description: 'Manage the statuses used in time off workflows.',
          path: '/maintenance/time-off-statuses',
          permission: 'TimeOffStatuses',
        },
        {
          title: 'Type of Time Off',
          description: 'Define time off categories available to employees.',
          path: '/maintenance/time-off-types',
          permission: 'TimeOffCategories',
        },
        {
          title: 'Type of Time Off by Country',
          description: 'Assign time off types to specific countries.',
          path: '/maintenance/category-country',
          permission: 'TimeOffCategoriesByCountry',
        },
        {
          title: 'Users',
          description: 'Manage application user accounts and access.',
          path: '/maintenance/users',
          permission: 'Users',
        },
        {
          title: 'Workday Info',
          description: 'Configure workday calendars and schedule data.',
          path: '/maintenance/workday-info',
          permission: 'WorkdayInfo',
        },
      ],
    },
  ],
};

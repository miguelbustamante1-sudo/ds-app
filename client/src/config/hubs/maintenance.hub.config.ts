import { HubConfig } from './hub.types';

export const maintenanceHubConfig: HubConfig = {
  key: 'maintenance',
  title: 'Maintenance',
  subtitle: 'Manage master data tables used across the application.',
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
      title: 'Regions',
      description: 'Create and manage region definitions used to group countries.',
      path: '/maintenance/regions',
      permission: 'Regions',
    },
    {
      title: 'Supervisor Assignments',
      description: 'Assign and review supervisor relationships.',
      path: '/maintenance/supervisor-assignments',
      permission: 'SupervisorAssignments',
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
    {
      title: 'Shifts',
      description: 'Define and manage reusable shift templates (start/end times, weekly hours) that can be assigned to team members.',
      path: '/maintenance/shifts',
      permission: 'Shift',
    },
    {
      title: 'Reports',
      description: 'Access Maintenance and data quality reports.',
      path: '/reports?module=maintenance',
    },
  ],
};

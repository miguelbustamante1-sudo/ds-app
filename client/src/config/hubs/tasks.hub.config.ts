import { HubConfig } from './hub.types';

export const tasksHubConfig: HubConfig = {
  key: 'tasks',
  title: 'Tasks',
  subtitle: 'Manage your task inbox, standalone tasks, recurring templates, and workflow definitions.',
  sections: [
    {
      title: 'My Tasks',
      description: 'View and act on workflow and standalone tasks assigned to you.',
      buttons: [
        {
          title: 'Task Inbox',
          description: 'See all pending workflow tasks and standalone tasks assigned to you.',
          path: '/my-tasks',
          permission: 'Workflow',
        },
      ],
    },
    {
      title: 'Administration',
      description: 'Manage standalone tasks, recurring templates, and workflow definitions.',
      buttons: [
        {
          title: 'Standalone Tasks',
          description: 'Create and manage one-off tasks assigned directly to team members.',
          path: '/admin/standalone-tasks',
          permission: 'StandaloneTaskAdmin',
        },
        {
          title: 'Recurring Templates',
          description: 'Define recurring task templates that auto-generate instances on a schedule.',
          path: '/admin/recurring-task-templates',
          permission: 'StandaloneTaskAdmin',
        },
        {
          title: 'Monday Connections',
          description: 'Connect Monday.com boards to pull items in as standalone tasks.',
          path: '/admin/monday-connections',
          permission: 'StandaloneTaskAdmin',
        },
        {
          title: 'Workflow Templates',
          description: 'Build and publish workflow templates that define multi-step task sequences.',
          path: '/admin/workflow/templates',
          permission: 'WorkflowAdmin',
        },
        {
          title: 'Workflow Instances',
          description: 'Monitor active workflow instances and track their progress.',
          path: '/admin/workflow/instances',
          permission: 'WorkflowAdmin',
        },
      ],
    },
  ],
};

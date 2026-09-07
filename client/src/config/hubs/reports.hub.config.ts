import { HubConfig } from './hub.types';

export const reportsHubConfig: HubConfig = {
  key: 'reports',
  title: 'Data & Intelligence',
  subtitle: 'Access analytics, reports, and data management tools across all modules.',
  buttons: [
    {
      title: 'Reports',
      description: 'View and run pre-built reports across all modules.',
      path: '/reports',
      permission: 'Reports',
    },
    {
      title: 'Manage Dynamic Reports',
      description: 'Create and manage custom reports with a drag-and-drop builder.',
      path: '/reports/dynamic',
      permission: 'Reports',
    },
    {
      title: 'Template Builder',
      description: 'Build and manage document templates used across the system.',
      path: '/template-builder',
      permission: 'PersistenceTables',
    },
    {
      title: 'Data Import',
      description: 'Import and validate bulk data into the system.',
      path: '/data-import',
      permission: 'PersistenceTables',
    },
    {
      title: 'AI Assistant',
      description: 'Ask questions and get AI-powered answers across your data and knowledge base.',
      path: '/ai/chat',
      permission: 'AiChat',
    },
  ],
};

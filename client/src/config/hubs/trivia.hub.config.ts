import { HubConfig } from './hub.types';

export const triviaHubConfig: HubConfig = {
  key: 'trivia',
  title: 'Trivia',
  subtitle: 'Manage the Team Leader Trivia question bank shown on the dashboard.',
  buttons: [
    {
      title: 'Manage Trivia Questions',
      description: 'Review, activate/deactivate, or delete trivia questions, and pull new ones from the knowledge base.',
      path: '/trivia-hub/manage-questions',
      role: 'admin',
    },
  ],
};

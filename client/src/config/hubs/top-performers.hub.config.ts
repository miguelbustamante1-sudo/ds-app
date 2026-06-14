import { HubConfig } from './hub.types';

export const topPerformersHubConfig: HubConfig = {
  key: 'top-performers',
  title: 'Top Performers',
  subtitle: 'Manage nomination cycles, submit nominations, vote, and review committee results.',
  sections: [
    {
      title: 'Nominations',
      description: 'Submit peer, admin, or customer nominations for the active cycle.',
      buttons: [
        {
          title: 'Peer Nomination',
          description: 'Nominate a colleague from your team for outstanding performance.',
          path: '/top-performers/nominations/peer',
          permission: 'TopPerformers',
        },
        {
          title: 'Admin Nomination',
          description: 'Submit an admin-sourced nomination on behalf of a team.',
          path: '/top-performers/nominations/admin',
          permission: 'TopPerformers',
        },
        {
          title: 'Customer Nomination',
          description: 'Record a customer-submitted nomination for a team member.',
          path: '/top-performers/nominations/customer',
          permission: 'TopPerformers',
        },
      ],
    },
    {
      title: 'Voting',
      description: 'Rank anonymized nominees for the active cycle.',
      buttons: [
        {
          title: 'Vote',
          description: 'Drag-and-rank anonymized nominees to cast your vote.',
          path: '/top-performers/vote',
          permission: 'TopPerformers',
        },
      ],
    },
    {
      title: 'Committee',
      description: 'Review results and make final decisions on top performer selections.',
      buttons: [
        {
          title: 'Committee Results',
          description: 'View the leaderboard, candidate details, confirm decisions, and export results.',
          path: '/top-performers/committee',
          permission: 'ComitatTopPerformers',
        },
      ],
    },
    {
      title: 'Administration',
      description: 'Manage cycles and review anonymized nominations before voting opens.',
      buttons: [
        {
          title: 'Cycle Management',
          description: 'Create and manage nomination cycles — open, close, and trigger anonymization.',
          path: '/top-performers/admin/cycles',
          permission: 'TopPerformers_Admin',
        },
        {
          title: 'Anonymization Review',
          description: 'Review and approve AI-anonymized nominations before they go to voters.',
          path: '/top-performers/admin/anonymization',
          permission: 'TopPerformers_Admin',
        },
      ],
    },
  ],
};

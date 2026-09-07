import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  searchTeamMembers,
  getTeamMemberProfile,
  getDirectReports,
} from '../services/teamMember/queries/getTeamMembersForMcp';
import {
  getUpcomingTimeoffs,
  getTimeoffHistory,
} from '../services/timeoff/queries/getTimeoffsForMcp';

const TOOLS: Tool[] = [
  {
    name: 'search_team_members',
    description:
      'Search active team members by name, surname, or known-as alias. Returns up to 20 matches with basic profile info.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name or partial name to search for' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_team_member_profile',
    description:
      'Get the full profile for a team member: names, position, country, seniority, supervisor, and active status.',
    inputSchema: {
      type: 'object',
      properties: {
        teamMemberId: { type: 'number', description: "The team member's primary key ID" },
      },
      required: ['teamMemberId'],
    },
  },
  {
    name: 'get_direct_reports',
    description: 'Get the list of active team members currently assigned to a supervisor.',
    inputSchema: {
      type: 'object',
      properties: {
        supervisorId: {
          type: 'number',
          description: 'The teamMemberId of the supervisor',
        },
      },
      required: ['supervisorId'],
    },
  },
  {
    name: 'get_upcoming_timeoffs',
    description:
      'Get Tentative and Acknowledged time-off requests for a team member from today forward. Each record includes a changelog array showing the history of changes (date, comment, and only the fields that actually changed).',
    inputSchema: {
      type: 'object',
      properties: {
        teamMemberId: { type: 'number', description: "The team member's primary key ID" },
      },
      required: ['teamMemberId'],
    },
  },
  {
    name: 'get_timeoff_history',
    description:
      'Get time-off records for a team member in a given calendar year. Each record includes a changelog array showing the history of changes (date, comment, and only the fields that actually changed).',
    inputSchema: {
      type: 'object',
      properties: {
        teamMemberId: { type: 'number', description: "The team member's primary key ID" },
        year: { type: 'number', description: 'Four-digit calendar year (e.g. 2025)' },
      },
      required: ['teamMemberId', 'year'],
    },
  },
];

export function createMcpServer(): Server {
  const server = new Server(
    { name: 'ds-app', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      return {
        content: [{ type: 'text' as const, text: 'Error: missing arguments' }],
        isError: true,
      };
    }

    try {
      let result: unknown;

      if (name === 'search_team_members') {
        const { query } = args as { query: string };
        result = await searchTeamMembers(query);
      } else if (name === 'get_team_member_profile') {
        const { teamMemberId } = args as { teamMemberId: number };
        result = await getTeamMemberProfile(teamMemberId);
      } else if (name === 'get_direct_reports') {
        const { supervisorId } = args as { supervisorId: number };
        result = await getDirectReports(supervisorId);
      } else if (name === 'get_upcoming_timeoffs') {
        const { teamMemberId } = args as { teamMemberId: number };
        result = await getUpcomingTimeoffs(teamMemberId);
      } else if (name === 'get_timeoff_history') {
        const { teamMemberId, year } = args as { teamMemberId: number; year: number };
        result = await getTimeoffHistory(teamMemberId, year);
      } else {
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

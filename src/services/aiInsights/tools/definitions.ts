import type { FuelixToolDefinition } from '../fuelixClient';

export const AI_TOOLS: FuelixToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_upcoming_tentative',
      description:
        'Returns time-off requests in Tentative status within the next 45 days for the user and their team. Use when asked about upcoming or unacknowledged time-off.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_monthly_summary',
      description:
        'Returns a summary of active time-off requests for the current month across the user and their team. Active means not Cancelled, Rejected, or Split.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_coverage_density',
      description:
        'Returns weeks in the next 90 days where 3 or more team members have active time-off simultaneously. Use for planning or coverage risk questions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_timeoff_by_month',
      description:
        'Returns all active time-off requests for a specific month. Accepts an optional month in YYYY-MM format. Defaults to the current month.',
      parameters: {
        type: 'object',
        properties: {
          month: {
            type: 'string',
            description: 'Month to query in YYYY-MM format. Defaults to current month.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_timeoff',
      description:
        "Returns the requesting user's own active time-off breakdown only. Use when the user asks specifically about their own time-off, not their team's.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_yearly_summary',
      description:
        'Returns a yearly time-off usage summary per team member. Use for annual planning or questions about how much time-off has been taken.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_holiday_swaps',
      description:
        'Returns active approved holiday swaps for the user and their team — cases where a team member moved a public holiday (e.g. May 1 Labour Day) to a different personal day.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

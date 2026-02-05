/**
 * Supervisor Service
 * Exports supervisor-related queries and operations
 */

export {
  getTeamMembersBySupervisor,
  verifySupervisorRelationship,
  getTeamTimeOffByMonth,
  getTeamTimeOffCurrentMonth,
  getTeamYearlySummary,
  getTeamMemberTimeOffBreakdown,
  getAllTeamTimeOffs,
} from './queries';

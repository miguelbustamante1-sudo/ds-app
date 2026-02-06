/**
 * Supervisor Service
 * Exports supervisor-related queries and operations
 */

export {
  getTeamMembersBySupervisor,
  verifySupervisorRelationship,
  getTeamTimeOffByMonth,
  getTeamTimeOffByCountry,
  getTeamTimeOffCurrentMonth,
  getTeamYearlySummary,
  getTeamMemberTimeOffBreakdown,
  getAllTeamTimeOffs,
} from './queries';

/**
 * Central export for all DTOs
 * This allows clean imports like: import { CountryDTO, CreateCountryDTO } from '@shared/dto'
 */

// Auth DTOs
export * from './AuthUser';

// Client DTOs
export * from './Client';
export * from './ClientContact';

// Domain DTOs
export * from './Country';
export * from './Endorsement';
export * from './Hiring';
export * from './Holiday';
export * from './Region';
export * from './Role';
export * from './Project';
export * from './ProjectAssignment';
export * from './SupervisorAssignment';
export * from './SupervisedTeamMember';
export * from './TeamMember';
export * from './TeamMemberReport';
export * from './TimeOff';
export * from './TimeOffPeriodMaintenance';
export * from './TimeOffCategory';
export * from './CategoryCountry';
export * from './TimeOffStatus';
export * from './User';
export * from './WorkdayInfo';
export * from './FunctionalArea';
export * from './FieldglassSow';

// Communication DTOs
export * from './Notification';

export * from './Bench';
export * from './BonusCategory';
export * from './HolidaySwap';
export * from './PendingRequest';
export * from './TierBand';
export * from './TeamMemberBonus';
export * from './CompensatoryTime';
export * from './TimeOffChangeLog';
export * from './DynamicReport';
export * from './StoredProcedure';

// Security DTOs
export * from './Permission';
export * from './SecurityRole';
export * from './Option';
export * from './AuthUserWithRoles';

// Persistence DTOs
export * from './PersistenceTemplate';
export * from './PersistenceTable';
export * from './PersistenceJob';

// Shift DTOs
export * from './Shift';
export * from './ShiftDetail';

// Supervisor V2 DTOs
export type { SupervisorTeamOverviewDTO } from './SupervisorTeamOverview';

// Standalone Tasks DTOs
export * from './StandaloneTask';
export * from './ApiKey';

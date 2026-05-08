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
export * from './TimeOffCategory';
export * from './CategoryCountry';
export * from './TimeOffStatus';
export * from './User';
export * from './WorkdayInfo';
export * from './FunctionalArea';

// Communication DTOs
export * from './Notification';

export * from './Bench';
export * from './HolidaySwap';
export * from './PendingRequest';
export * from './TierBand';
export * from './TimeOffChangeLog';
export * from './DynamicReport';

// Security DTOs
export * from './Permission';
export * from './SecurityRole';
export * from './Option';

// Persistence DTOs
export * from './PersistenceTemplate';
export * from './PersistenceTable';
export * from './PersistenceJob';

// Shift DTOs
export * from './Shift';
export * from './ShiftDetail';

/**
 * Central export for all DTOs
 * This allows clean imports like: import { CountryDTO, CreateCountryDTO } from '@shared/dto'
 */

// Auth DTOs
export * from './AuthUser';

// Domain DTOs
export * from './Country';
export * from './Holiday';
export * from './Region';
export * from './Role';
export * from './Project';
export * from './ProjectAssignment';
export * from './SupervisorAssignment';
export * from './SupervisedTeamMember';
export * from './TeamMember';
export * from './TimeOff';
export * from './TimeOffCategory';
export * from './CategoryCountry';
export * from './TimeOffStatus';
export * from './User';

// Communication DTOs
export * from './Notification';

// Security DTOs
export * from './Permission';
export * from './SecurityRole';

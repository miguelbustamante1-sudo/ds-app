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
export * from './SupervisorCoverage';
export * from './AuthorizerAssignment';
export * from './SupervisedTeamMember';
export * from './TeamMember';
export * from './TeamMemberReport';
export * from './TimeOff';
export * from './TimeOffExternalFeed';
export * from './TimeOffExternalDriftCheck';
export * from './TimeOffPeriodMaintenance';
export * from './TimeOffCategory';
export * from './CategoryCountry';
export * from './TimeOffStatus';
export * from './User';
export * from './WorkdayInfo';
export * from './FunctionalArea';
export * from './FlagTypeAction';
export * from './Finding';

// Communication DTOs
export * from './Notification';

export * from './Bench';
export * from './BonusCategory';
export * from './HolidaySwap';
export * from './PendingRequest';
export * from './TierBand';
export * from './TeamMemberBonus';
export * from './TeamMemberReimbursement';
export * from './TeamMemberOncall';
export * from './TeamMemberOncallExternalIntake';
export * from './IncomeType';
export * from './OtherIncome';
export * from './OtherIncomeImport';
export * from './Payrol';
export * from './CompensatoryTime';
export * from './TimeOffChangeLog';
export * from './DynamicReport';

// Security DTOs
export * from './Permission';
export * from './SecurityRole';
export * from './Option';
export * from './AuthUserWithRoles';
export * from './AuthUserDetail';

// Persistence DTOs
export * from './PersistenceTemplate';
export * from './PersistenceTable';
export * from './PersistenceJob';

// Shift DTOs
export * from './Shift';
export * from './ShiftDetail';

// Phone Contract DTOs
export * from './PhoneContract';

// Supervisor V2 DTOs
export type { SupervisorTeamOverviewDTO } from './SupervisorTeamOverview';

// Standalone Tasks DTOs
export * from './StandaloneTask';
export * from './RecurringTaskTemplate';
export * from './ApiKey';
export * from './MondayConnection';

// Uploads DTOs
export * from './Upload';

// Top Performers DTOs
export * from './TopPerformersCycle';
export * from './TpNomination';
export * from './TpAnonymization';
export * from './TpVoting';
export * from './TpResults';

// Gift Card DTOs
export * from './GiftCardPool';
export * from './GiftCardReason';
export * from './GiftCardType';
export * from './GiftCardValue';
export * from './GiftCardAssignment';
export * from './GiftCardDocumentation';

// Laptop Inventory DTOs
export * from './LaptopInventory';

// Stored Procedures DTOs
export * from './StoredProcedure';

// Fieldglass SOW DTOs
export * from './FieldglassSow';

// External Bonus Intake DTOs
export * from './ExternalBonusIntake';

// Email DTOs
export * from './Email';

// Trivia DTOs
export * from './Trivia';

// Supervisor Flag DTOs
export * from './SupervisorFlag';

// Flag Intake DTOs
export * from './FlagIntake';

// Performance Management DTOs
export * from './PerformanceCase';

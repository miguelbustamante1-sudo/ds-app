import { Route, Routes, Navigate } from 'react-router';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Layout1Page } from '@/pages/page';
import { SignInPage } from '@/pages/auth/signin';
import { AuthCallbackPage } from '@/pages/auth/callback';
import { RequireAuth } from '@/auth/require-auth';
import { CountriesPage } from '@/pages/maintenance/countries';
import { ProjectsPage } from '@/pages/maintenance/projects';
import { TeamMembersPage } from '@/pages/maintenance/team-members';
import { UsersPage } from '@/pages/maintenance/users';
import { SupervisorAssignmentsPage } from '@/pages/maintenance/supervisor-assignments';
import { HolidaysPage } from '@/pages/maintenance/holidays';
import { CategoryCountryPage } from '@/pages/maintenance/category-country';
import { MyTimeOffPage } from '@/pages/timeoff';
import { EditTimeOffPage } from '@/pages/timeoff/edit';
import { EditSupervisorTimeOffPage } from '@/pages/timeoff/supervisor/edit';
import { SupervisorTimeOffPage } from '@/pages/timeoff/supervisor';
import { SupervisorTeamOverviewPage } from '@/pages/timeoff/supervisor-v2';
import { SupervisorMemberDetailPage } from '@/pages/timeoff/supervisor-v2/detail';
import { TimeOffManagementPage } from '@/pages/timeoff/management';
import { MyTeamPage } from '@/pages/my-team';
import { TeamMemberProfilePage } from '@/pages/my-team/profile';
import { AnnouncementsPage } from '@/pages/announcements';
import { NotificationCenterPage } from '@/pages/notifications';
import { ProjectAssignmentsPage } from '@/pages/project-assignments';
import { TimeOffDetailPage } from '@/pages/timeoff/detail';
import { TimeOffActivityPage } from '@/pages/timeoff/activity';
import { EndorsementsPage } from '@/pages/endorsements';
import { EndorsementCreatePage } from '@/pages/endorsements/create';
import { EndorsementDetailPage } from '@/pages/endorsements/detail';
import { TierBandsPage } from '@/pages/maintenance/tier-bands';
import { BonusCategoriesPage } from '@/pages/maintenance/bonus-categories';
import { TeamMemberBonusesPage } from '@/pages/maintenance/team-member-bonuses';
import { BonusSubcategoriesPage } from '@/pages/maintenance/bonus-subcategories';
import { ClientsPage } from '@/pages/maintenance/clients';
import { ClientContactsPage } from '@/pages/maintenance/client-contacts';
import { TimeOffTypesPage } from '@/pages/maintenance/time-off-types';
import { TimeOffStatusesPage } from '@/pages/maintenance/time-off-statuses';
import { WorkdayInfoPage } from '@/pages/maintenance/workday-info';
import { WorkdayInfoDetailPage } from '@/pages/maintenance/workday-info/detail';
import { FunctionalAreaPage } from '@/pages/maintenance/functional-area';
import { ShiftsPage } from '@/pages/maintenance/shifts';
import { TimeOffPeriodBackfillPage } from '@/pages/maintenance/timeoff-period-backfill';
import { EmailTestPage } from '@/pages/maintenance/email-test';
import { ReportsPage } from '@/pages/reports';
import { TimeOffChangeLogPage } from '@/pages/reports/time-off/change-log';
import { UpcomingVacationPage } from '@/pages/reports/time-off/upcoming-vacation';
import { WorkdayReconciliationPage } from '@/pages/reports/time-off/workday-reconciliation';
import { DynamicReportsManagementPage } from '@/pages/reports/dynamic';
import { ReportWizard } from '@/pages/reports/dynamic/wizard/ReportWizard';
import { RunReportPage } from '@/pages/reports/dynamic/run/RunReportPage';
import { HolidaySwapsPage } from '@/pages/holiday-swaps';
import { HolidaySwapDetailPage } from '@/pages/holiday-swaps/detail';
import { SupervisorHolidaySwapsPage } from '@/pages/holiday-swaps/supervisor';
import { BenchMovePage } from '@/pages/bench-move';
import { BenchMoveDetailPage } from '@/pages/bench-move/detail';
import { EndBenchPage } from '@/pages/end-bench';
import { PendingRequestsPage } from '@/pages/my-team/pending-requests';
import { MyProfilePage } from '@/pages/my-profile';
import { HiringPage } from '@/pages/hiring';
import { HiringDetailPage } from '@/pages/hiring/detail';
import { RolesPage } from '@/pages/security/roles';
import { OptionsPage } from '@/pages/security/options';
import { PermissionsPage } from '@/pages/security/permissions';
import { UserRolesPage } from '@/pages/security/user-roles';
import { TemplateBuilderPage } from '@/pages/template-builder';
import { DataImportPage } from '@/pages/data-import';
import { DataImportDetailPage } from '@/pages/data-import/detail';
import { DataImportNewPage } from '@/pages/data-import/new';
import { TimeOffExceptionPage } from '@/pages/timeoff/exception';
import { TimeOffExceptionDetailPage } from '@/pages/timeoff/exception/detail';
import { HolidaySwapExceptionPage } from '@/pages/holiday-swaps/exception';
import { ApprovalManagementPage } from '@/pages/approval-management';
import { CompensatoryTimeIntakePage } from '@/pages/compensatory-time/intake';
import { CompensatoryTimeUsagePage } from '@/pages/compensatory-time/usage';
import { SupervisorCompTimePage } from '@/pages/comp-time/supervisor';
import { TemplateListPage } from '@/pages/admin/workflow/TemplateListPage';
import { TemplateFormPage } from '@/pages/admin/workflow/TemplateFormPage';
import { InstanceListPage } from '@/pages/admin/workflow/InstanceListPage';
import { InstanceDetailPage } from '@/pages/admin/workflow/InstanceDetailPage';
import { TaskInboxPage } from '@/pages/workflow/TaskInboxPage';
import { WorkflowInstancePage } from '@/pages/workflow/WorkflowInstancePage';
import { GiftCardPoolsPage } from '@/pages/maintenance/gift-cards/pools';
import { GiftCardReasonsPage } from '@/pages/maintenance/gift-cards/reasons';
import { GiftCardTypesPage } from '@/pages/maintenance/gift-cards/card-types';
import { GiftCardValuesPage } from '@/pages/maintenance/gift-cards/card-values';
// Hub Landing Pages
import { UdsColorDemoPage } from '@/pages/uds-color-demo';
import TimeOffHubPage from '@/pages/time-off-hub';
import HiringHubPage from '@/pages/hiring-hub';
import SecurityHubPage from '@/pages/security-hub';
import MaintenanceHubPage from '@/pages/maintenance-hub';
import ProjectManagementHubPage from '@/pages/project-management-hub';
import SelfServiceHubPage from '@/pages/self-service-hub';
import ReportsHubPage from '@/pages/reports-hub';
import CommunicationsHubPage from '@/pages/communications-hub';
import OperationsHubPage from '@/pages/operations-hub';
import GovernanceHubPage from '@/pages/governance-hub';
import TopPerformersHubPage from '@/pages/top-performers-hub';
import { StandaloneTasksAdminPage } from '@/pages/admin/standalone-tasks';
import { ApiKeysAdminPage } from '@/pages/admin/api-keys';
import { AiChatPage } from '@/pages/ai-chat';
import { TpCyclesPage } from '@/pages/top-performers/admin/cycles';
import AnonymizationReviewPage from '@/pages/top-performers/admin/anonymization';
import NominationsOverviewPage from '@/pages/top-performers/admin/nominations-overview';
import VotingPage from '@/pages/top-performers/vote';
import CommitteePage from '@/pages/top-performers/committee';
import PeerNominationPage from '@/pages/top-performers/nominations/peer';
import AdminNominationPage from '@/pages/top-performers/nominations/admin';
import CustomerNominationPage from '@/pages/top-performers/nominations/customer';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route path="/auth/signin" element={<SignInPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {/* Design System — UDS Color Reference (no auth required) */}
      <Route path="/uds-colors" element={<UdsColorDemoPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Layout1Page />} />
        <Route path="/my-team" element={<MyTeamPage />} />
        <Route path="/my-profile" element={<MyProfilePage />} />
        <Route path="/my-team/pending" element={<PendingRequestsPage />} />
        <Route path="/my-team/:id" element={<TeamMemberProfilePage />} />
        <Route path="/my-time-off" element={<MyTimeOffPage />} />
        <Route path="/my-time-off/edit/:timeOffId" element={<EditTimeOffPage />} />
        <Route path="/supervisor-time-off" element={<SupervisorTimeOffPage />} />
        <Route path="/supervisor-time-off/edit/:timeOffId" element={<EditSupervisorTimeOffPage />} />
        <Route path="/supervisor-time-off-v2" element={<SupervisorTeamOverviewPage />} />
        <Route path="/supervisor-time-off-v2/:teamMemberId" element={<SupervisorMemberDetailPage />} />
        <Route path="/timeoff-exception" element={<TimeOffExceptionPage />} />
        <Route path="/timeoff-exception-detail/:timeOffId" element={<TimeOffExceptionDetailPage />} />
        <Route path="/time-off-management" element={<TimeOffManagementPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/notification-center" element={<NotificationCenterPage />} />
        <Route path="/project-assignments" element={<ProjectAssignmentsPage />} />
        <Route path="/timeoff-detail/:timeOffId" element={<TimeOffDetailPage />} />
        <Route path="/timeoff-activity" element={<TimeOffActivityPage />} />
        <Route path="/holiday-swaps" element={<HolidaySwapsPage />} />
        <Route path="/holiday-swaps/:swapId" element={<HolidaySwapDetailPage />} />
        <Route path="/supervisor-holiday-swaps" element={<SupervisorHolidaySwapsPage />} />
        <Route path="/holiday-swap-exception" element={<HolidaySwapExceptionPage />} />
        <Route path="/bench-move" element={<BenchMovePage />} />
        <Route path="/bench-move/:benchId" element={<BenchMoveDetailPage />} />
        <Route path="/end-bench" element={<EndBenchPage />} />
        <Route path="/endorsements" element={<EndorsementsPage />} />
        <Route path="/endorsements/create" element={<EndorsementCreatePage />} />
        <Route path="/endorsements/:id" element={<EndorsementDetailPage />} />
        <Route path="/maintenance/countries" element={<CountriesPage />} />
        <Route path="/maintenance/projects" element={<ProjectsPage />} />
        <Route path="/maintenance/team-members" element={<TeamMembersPage />} />
        <Route path="/maintenance/users" element={<UsersPage />} />
        <Route path="/maintenance/supervisor-assignments" element={<SupervisorAssignmentsPage />} />
        <Route path="/maintenance/team-member-bonuses" element={<TeamMemberBonusesPage />} />
        <Route path="/maintenance/holidays" element={<HolidaysPage />} />
        <Route path="/maintenance/category-country" element={<CategoryCountryPage />} />
        <Route path="/maintenance/tier-bands" element={<TierBandsPage />} />
        <Route path="/maintenance/bonus-categories" element={<BonusCategoriesPage />} />
        <Route path="/maintenance/bonus-subcategories" element={<BonusSubcategoriesPage />} />
        <Route path="/maintenance/clients" element={<ClientsPage />} />
        <Route path="/maintenance/client-contacts" element={<ClientContactsPage />} />
        <Route path="/maintenance/time-off-types" element={<TimeOffTypesPage />} />
        <Route path="/maintenance/time-off-statuses" element={<TimeOffStatusesPage />} />
        <Route path="/maintenance/workday-info" element={<WorkdayInfoPage />} />
        <Route path="/maintenance/workday-info/:wdid" element={<WorkdayInfoDetailPage />} />
        <Route path="/maintenance/functional-areas" element={<FunctionalAreaPage />} />
        <Route path="/maintenance/shifts" element={<ShiftsPage />} />
        <Route path="/maintenance/shifts" element={<ShiftsPage />} />
        <Route path="/maintenance/gift-cards/pools" element={<GiftCardPoolsPage />} />
        <Route path="/maintenance/gift-cards/reasons" element={<GiftCardReasonsPage />} />
        <Route path="/maintenance/gift-cards/card-types" element={<GiftCardTypesPage />} />
        <Route path="/maintenance/gift-cards/card-values" element={<GiftCardValuesPage />} />
        <Route path="/maintenance/timeoff-period-backfill" element={<TimeOffPeriodBackfillPage />} />
        <Route path="/maintenance/email-test" element={<EmailTestPage />} />
        <Route path="/hiring" element={<HiringPage />} />
        <Route path="/hiring/new" element={<HiringDetailPage />} />
        <Route path="/hiring/:id" element={<HiringDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/time-off/change-log" element={<TimeOffChangeLogPage />} />
        <Route path="/reports/time-off/upcoming-vacation" element={<UpcomingVacationPage />} />
        <Route path="/reports/time-off/workday-reconciliation" element={<WorkdayReconciliationPage />} />
        <Route path="/reports/dynamic" element={<DynamicReportsManagementPage />} />
        <Route path="/reports/dynamic/new" element={<ReportWizard />} />
        <Route path="/reports/dynamic/:id/edit" element={<ReportWizard />} />
        <Route path="/reports/dynamic/:id/run" element={<RunReportPage />} />
        {/* Template & Data Import */}
        <Route path="/template-builder" element={<TemplateBuilderPage />} />
        <Route path="/data-import" element={<DataImportPage />} />
        <Route path="/data-import/new" element={<DataImportNewPage />} />
        <Route path="/data-import/:id" element={<DataImportDetailPage />} />
        {/* Security - RBAC management */}
        <Route path="/security/roles" element={<RolesPage />} />
        <Route path="/security/options" element={<OptionsPage />} />
        <Route path="/security/permissions" element={<PermissionsPage />} />
        <Route path="/security/user-roles" element={<UserRolesPage />} />
        {/* Shifts */}
        <Route path="/shifts" element={<ShiftsPage />} />
        {/* Approval Management */}
        <Route path="/approval-management" element={<ApprovalManagementPage />} />
        {/* Compensatory Time */}
        <Route path="/compensatory-time/intake" element={<CompensatoryTimeIntakePage />} />
        <Route path="/compensatory-time/usage" element={<CompensatoryTimeUsagePage />} />
        <Route path="/comp-time/supervisor" element={<SupervisorCompTimePage />} />
        {/* Standalone Tasks Admin */}
        <Route path="/admin/standalone-tasks" element={<StandaloneTasksAdminPage />} />
        <Route path="/admin/standalone-tasks/api-keys" element={<ApiKeysAdminPage />} />
        {/* Workflow Admin */}
        <Route path="/admin/workflow/templates" element={<TemplateListPage />} />
        <Route path="/admin/workflow/templates/new" element={<TemplateFormPage />} />
        <Route path="/admin/workflow/templates/:wflId/edit" element={<TemplateFormPage />} />
        <Route path="/admin/workflow/instances" element={<InstanceListPage />} />
        <Route path="/admin/workflow/instances/:winId" element={<InstanceDetailPage />} />
        {/* Workflow Inbox / Execution */}
        <Route path="/my-tasks" element={<TaskInboxPage />} />
        <Route path="/workflow/instances/:winId" element={<WorkflowInstancePage />} />
        {/* Hub Landing Pages */}
        <Route path="/time-off-hub" element={<TimeOffHubPage />} />
        <Route path="/hiring-hub" element={<HiringHubPage />} />
        <Route path="/security-hub" element={<SecurityHubPage />} />
        <Route path="/maintenance-hub" element={<MaintenanceHubPage />} />
        <Route path="/project-management-hub" element={<ProjectManagementHubPage />} />
        <Route path="/self-service-hub" element={<SelfServiceHubPage />} />
        <Route path="/reports-hub" element={<ReportsHubPage />} />
        <Route path="/communications-hub" element={<CommunicationsHubPage />} />
        <Route path="/operations-hub" element={<OperationsHubPage />} />
        <Route path="/governance-hub" element={<GovernanceHubPage />} />
        <Route path="/top-performers-hub" element={<TopPerformersHubPage />} />
        <Route path="/ai/chat" element={<AiChatPage />} />
        {/* Top Performers */}
        <Route path="/top-performers/admin/cycles" element={<TpCyclesPage />} />
        <Route path="/top-performers/admin/anonymization" element={<AnonymizationReviewPage />} />
        <Route path="/top-performers/admin/nominations-overview" element={<NominationsOverviewPage />} />
        <Route path="/top-performers/vote" element={<VotingPage />} />
        <Route path="/top-performers/committee" element={<CommitteePage />} />
        <Route path="/top-performers/nominations/peer" element={<PeerNominationPage />} />
        <Route path="/top-performers/nominations/admin" element={<AdminNominationPage />} />
        <Route path="/top-performers/nominations/customer" element={<CustomerNominationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      
    </Routes>
  );
}

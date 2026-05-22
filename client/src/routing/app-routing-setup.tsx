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
import { SupervisorTimeOffPage } from '@/pages/timeoff/supervisor';
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
import { ReportsPage } from '@/pages/reports';
import { TimeOffChangeLogPage } from '@/pages/reports/time-off/change-log';
import { UpcomingVacationPage } from '@/pages/reports/time-off/upcoming-vacation';
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

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route path="/auth/signin" element={<SignInPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
        <Route path="/supervisor-time-off" element={<SupervisorTimeOffPage />} />
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
        <Route path="/maintenance/timeoff-period-backfill" element={<TimeOffPeriodBackfillPage />} />
        <Route path="/hiring" element={<HiringPage />} />
        <Route path="/hiring/new" element={<HiringDetailPage />} />
        <Route path="/hiring/:id" element={<HiringDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/time-off/change-log" element={<TimeOffChangeLogPage />} />
        <Route path="/reports/time-off/upcoming-vacation" element={<UpcomingVacationPage />} />
        <Route path="/reports/dynamic" element={<DynamicReportsManagementPage />} />
        <Route path="/reports/dynamic/new" element={<ReportWizard />} />
        <Route path="/reports/dynamic/:id/edit" element={<ReportWizard />} />
        <Route path="/reports/dynamic/:id/run" element={<RunReportPage />} />
        {/* Security - RBAC management */}
        <Route path="/security/roles" element={<RolesPage />} />
        <Route path="/security/options" element={<OptionsPage />} />
        <Route path="/security/permissions" element={<PermissionsPage />} />
        {/* Persistence Templates */}
        <Route path="/template-builder" element={<TemplateBuilderPage />} />
        {/* Data Import - Persistence Jobs */}
        <Route path="/data-import" element={<DataImportPage />} />
        <Route path="/data-import/new" element={<DataImportNewPage />} />
        <Route path="/data-import/:id" element={<DataImportDetailPage />} />
        {/* Shifts */}
        <Route path="/shifts" element={<ShiftsPage />} />
        {/* Approval Management */}
        <Route path="/approval-management" element={<ApprovalManagementPage />} />
        {/* Compensatory Time */}
        <Route path="/compensatory-time/intake" element={<CompensatoryTimeIntakePage />} />
        <Route path="/compensatory-time/usage" element={<CompensatoryTimeUsagePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

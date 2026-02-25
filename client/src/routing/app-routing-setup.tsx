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
import { SupervisorVacationsPage } from '@/pages/timeoff/vacations';
import { TimeOffManagementPage } from '@/pages/timeoff/management';
import { MyTeamPage } from '@/pages/my-team';
import { TeamMemberProfilePage } from '@/pages/my-team/profile';
import { AnnouncementsPage } from '@/pages/announcements';
import { NotificationCenterPage } from '@/pages/notifications';
import { ProjectAssignmentsPage } from '@/pages/project-assignments';
import { TimeOffDetailPage } from '@/pages/timeoff/detail';
import { EndorsementsPage } from '@/pages/endorsements';
import { EndorsementCreatePage } from '@/pages/endorsements/create';
import { EndorsementDetailPage } from '@/pages/endorsements/detail';
import { TierBandsPage } from '@/pages/maintenance/tier-bands';
import { BonusCategoriesPage } from '@/pages/maintenance/bonus-categories';
import { BonusSubcategoriesPage } from '@/pages/maintenance/bonus-subcategories';
import { ClientsPage } from '@/pages/maintenance/clients';
import { ReportsPage } from '@/pages/reports';
import { TimeOffChangeLogPage } from '@/pages/reports/time-off/change-log';
import { HiringPage } from '@/pages/hiring';
import { HiringDetailPage } from '@/pages/hiring/detail';
import { RolesPage } from '@/pages/security/roles';
import { OptionsPage } from '@/pages/security/options';
import { PermissionsPage } from '@/pages/security/permissions';

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
        <Route path="/my-team/:id" element={<TeamMemberProfilePage />} />
        <Route path="/my-time-off" element={<MyTimeOffPage />} />
        <Route path="/supervisor-time-off" element={<SupervisorTimeOffPage />} />
        <Route path="/supervisor-vacations" element={<SupervisorVacationsPage />} />
        <Route path="/time-off-management" element={<TimeOffManagementPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/notification-center" element={<NotificationCenterPage />} />
        <Route path="/project-assignments" element={<ProjectAssignmentsPage />} />
        <Route path="/timeoff-detail/:timeOffId" element={<TimeOffDetailPage />} />
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
        <Route path="/hiring" element={<HiringPage />} />
        <Route path="/hiring/new" element={<HiringDetailPage />} />
        <Route path="/hiring/:id" element={<HiringDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/time-off/change-log" element={<TimeOffChangeLogPage />} />
        {/* Security - RBAC management */}
        <Route path="/security/roles" element={<RolesPage />} />
        <Route path="/security/options" element={<OptionsPage />} />
        <Route path="/security/permissions" element={<PermissionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

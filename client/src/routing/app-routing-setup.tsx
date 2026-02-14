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
import { ProjectAssignmentsPage } from '@/pages/project-assignments';

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
        <Route path="/time-off-management" element={<TimeOffManagementPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/project-assignments" element={<ProjectAssignmentsPage />} />
        <Route path="/maintenance/countries" element={<CountriesPage />} />
        <Route path="/maintenance/projects" element={<ProjectsPage />} />
        <Route path="/maintenance/team-members" element={<TeamMembersPage />} />
        <Route path="/maintenance/users" element={<UsersPage />} />
        <Route path="/maintenance/supervisor-assignments" element={<SupervisorAssignmentsPage />} />
        <Route path="/maintenance/holidays" element={<HolidaysPage />} />
        <Route path="/maintenance/category-country" element={<CategoryCountryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

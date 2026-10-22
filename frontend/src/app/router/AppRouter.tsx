import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RoleGuard } from '../../features/auth/components/RoleGuard'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { OrganizationRoute } from '../../features/organizations/components/OrganizationRoute'
import { AppLayout } from '../../layouts/AppLayout'
import { PublicLayout } from '../../layouts/PublicLayout'
import { AdminUserCreatePage } from '../../pages/AdminUserCreatePage'
import { AiRecommendationsPage } from '../../pages/AiRecommendationsPage'
import { DashboardPage } from '../../pages/DashboardPage'
import { PlatformAdminDashboardPage } from '../../pages/PlatformAdminDashboardPage'
import { EmployeesPage } from '../../pages/EmployeesPage'
import { ForbiddenPage } from '../../pages/ForbiddenPage'
import { InvitationAcceptPage } from '../../pages/InvitationAcceptPage'
import { LoginPage } from '../../pages/LoginPage'
import { MessagesPage } from '../../pages/MessagesPage'
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { LandingPage } from '../../pages/LandingPage'
import { NotFoundPage } from '../../pages/NotFoundPage'
import { OrganizationInvitationsPage } from '../../pages/OrganizationInvitationsPage'
import { ProfilePage } from '../../pages/ProfilePage'
import { SelectOrganizationPage } from '../../pages/SelectOrganizationPage'
import { ProjectsPage } from '../../pages/ProjectsPage'
import { ProjectDetailsPage } from '../../pages/ProjectDetailsPage'
import { SignupPage } from '../../pages/SignupPage'
import { RegisterOrganizerPage } from '../../pages/RegisterOrganizerPage'
import { TasksPage } from '../../pages/TasksPage'
import { TaskDetailPage } from '../../pages/TaskDetailPage'
import { TeamPage } from '../../pages/TeamPage'
import { DashboardEntryRoute } from '../../features/dashboard/components/DashboardEntryRoute'

// Dev-only visual check for avatar sizes; import.meta.env.DEV is false in builds, so this is dropped.
const AvatarCheckPage = import.meta.env.DEV
  ? lazy(() => import('../../pages/dev/AvatarCheckPage').then((module) => ({ default: module.AvatarCheckPage })))
  : null

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      {AvatarCheckPage ? <Route element={<Suspense><AvatarCheckPage /></Suspense>} path="/dev/avatars" /> : null}
      <Route element={<PublicLayout />}>
        <Route element={<InvitationAcceptPage />} path="/invitations/accept" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        <Route element={<ResetPasswordPage />} path="/reset-password" />
        <Route element={<RegisterOrganizerPage />} path="/register" />
        <Route element={<SignupPage />} path="/signup" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route element={<PlatformAdminDashboardPage />} path="/platform-admin" />
            <Route element={<AdminUserCreatePage />} path="/admin/users/new" />
          </Route>
          <Route element={<ForbiddenPage />} path="/forbidden" />
          <Route element={<SelectOrganizationPage />} path="/select-organization" />
          <Route element={<DashboardEntryRoute />}>
            <Route element={<OrganizationRoute />}>
              <Route element={<DashboardPage />} path="/dashboard" />
            </Route>
          </Route>
          <Route element={<OrganizationRoute />}>
            <Route element={<TasksPage />} path="/tasks" />
            <Route element={<TaskDetailPage />} path="/tasks/:taskId" />
            <Route element={<ProfilePage />} path="/profile" />
            <Route element={<MessagesPage />} path="/messages" />
            <Route element={<MessagesPage />} path="/messages/:conversationId" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['organization_admin', 'supervisor']} />}>
            <Route element={<ProjectsPage />} path="/projects" />
            <Route element={<ProjectDetailsPage />} path="/projects/:projectId" />
            <Route element={<AiRecommendationsPage />} path="/ai-recommendations" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['supervisor']} />}>
            <Route element={<EmployeesPage />} path="/employees" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['organization_admin']} />}>
            <Route element={<TeamPage />} path="/team" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['organization_admin']} />}>
            <Route element={<OrganizationInvitationsPage />} path="/organization/invitations" />
          </Route>
        </Route>
      </Route>
      <Route element={<PublicLayout />}>
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  )
}

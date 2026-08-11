import { Route, Routes } from 'react-router-dom'
import { RoleGuard } from '../../features/auth/components/RoleGuard'
import { ProtectedRoute } from '../../features/auth/components/ProtectedRoute'
import { OrganizationRoute } from '../../features/organizations/components/OrganizationRoute'
import { AppLayout } from '../../layouts/AppLayout'
import { AdminUserCreatePage } from '../../pages/AdminUserCreatePage'
import { AiRecommendationsPage } from '../../pages/AiRecommendationsPage'
import { DashboardPage } from '../../pages/DashboardPage'
import { EmployeesPage } from '../../pages/EmployeesPage'
import { ForbiddenPage } from '../../pages/ForbiddenPage'
import { InvitationAcceptPage } from '../../pages/InvitationAcceptPage'
import { LoginPage } from '../../pages/LoginPage'
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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LandingPage />} path="/" />
      <Route element={<InvitationAcceptPage />} path="/invitations/accept" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ForgotPasswordPage />} path="/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<RegisterOrganizerPage />} path="/register" />
      <Route element={<SignupPage />} path="/signup" />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<ForbiddenPage />} path="/forbidden" />
          <Route element={<SelectOrganizationPage />} path="/select-organization" />
          <Route element={<OrganizationRoute />}>
            <Route element={<DashboardPage />} path="/dashboard" />
            <Route element={<TasksPage />} path="/tasks" />
            <Route element={<ProfilePage />} path="/profile" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['organization_admin', 'supervisor']} />}>
            <Route element={<ProjectsPage />} path="/projects" />
            <Route element={<ProjectDetailsPage />} path="/projects/:projectId" />
            <Route element={<EmployeesPage />} path="/employees" />
            <Route element={<AiRecommendationsPage />} path="/ai-recommendations" />
          </Route>
          <Route element={<OrganizationRoute allowedRoles={['organization_admin']} />}>
            <Route element={<OrganizationInvitationsPage />} path="/organization/invitations" />
          </Route>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route element={<AdminUserCreatePage />} path="/admin/users/new" />
          </Route>
        </Route>
      </Route>
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  )
}

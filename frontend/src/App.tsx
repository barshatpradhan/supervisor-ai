import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { NotificationProvider } from './components/shared/notifications/NotificationProvider'
import { NotificationViewport } from './components/shared/notifications/NotificationViewport'
import { RoleGuard } from './features/auth/components/RoleGuard'
import { AuthProvider } from './features/auth/components/AuthProvider'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { OrganizationProvider } from './features/organizations/components/OrganizationProvider'
import { OrganizationRoute } from './features/organizations/components/OrganizationRoute'
import { AppLayout } from './layouts/AppLayout'
import { AdminUserCreatePage } from './pages/AdminUserCreatePage'
import { AiRecommendationsPage } from './pages/AiRecommendationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SignupPage } from './pages/SignupPage'
import { TasksPage } from './pages/TasksPage'

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <OrganizationProvider>
            <Routes>
              <Route element={<LoginPage />} path="/login" />
              <Route element={<SignupPage />} path="/signup" />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route element={<ForbiddenPage />} path="/forbidden" />
                  <Route element={<Navigate replace to="/dashboard" />} index />

                  <Route element={<OrganizationRoute />}>
                    <Route element={<DashboardPage />} path="/dashboard" />
                    <Route element={<TasksPage />} path="/tasks" />
                    <Route element={<ProfilePage />} path="/profile" />
                  </Route>

                  <Route
                    element={
                      <OrganizationRoute
                        allowedRoles={['organization_admin', 'supervisor']}
                      />
                    }
                  >
                    <Route element={<ProjectsPage />} path="/projects" />
                    <Route element={<EmployeesPage />} path="/employees" />
                    <Route
                      element={<AiRecommendationsPage />}
                      path="/ai-recommendations"
                    />
                  </Route>

                  <Route element={<RoleGuard allowedRoles={['admin']} />}>
                    <Route element={<AdminUserCreatePage />} path="/admin/users/new" />
                  </Route>
                </Route>
              </Route>
              <Route element={<Navigate replace to="/dashboard" />} path="*" />
            </Routes>
          </OrganizationProvider>
        </AuthProvider>
        <NotificationViewport />
      </NotificationProvider>
    </BrowserRouter>
  )
}

export default App

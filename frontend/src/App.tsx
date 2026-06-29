import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/components/AuthProvider'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { AiRecommendationsPage } from './pages/AiRecommendationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SignupPage } from './pages/SignupPage'
import { TasksPage } from './pages/TasksPage'

const appRoles = ['admin', 'supervisor', 'employee'] as const

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<SignupPage />} path="/signup" />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route element={<ForbiddenPage />} path="/forbidden" />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[...appRoles]} />}>
            <Route element={<AppLayout />}>
              <Route element={<Navigate replace to="/dashboard" />} index />
              <Route element={<DashboardPage />} path="/dashboard" />
              <Route element={<ProjectsPage />} path="/projects" />
              <Route element={<TasksPage />} path="/tasks" />
              <Route element={<EmployeesPage />} path="/employees" />
              <Route
                element={<AiRecommendationsPage />}
                path="/ai-recommendations"
              />
              <Route element={<ProfilePage />} path="/profile" />
            </Route>
          </Route>
          <Route element={<Navigate replace to="/dashboard" />} path="*" />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

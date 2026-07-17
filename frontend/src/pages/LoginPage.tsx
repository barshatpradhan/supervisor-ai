import { useLocation } from 'react-router-dom'
import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { LoginForm } from '../features/auth/components/LoginForm'
import {
  buildAuthPathWithReturnTo,
  getReturnToFromSearch,
} from '../features/invitations/utils/invitationNavigation'

export function LoginPage() {
  const location = useLocation()
  const returnTo = getReturnToFromSearch(location.search)

  return (
    <AuthPageFrame
      footerLabel="New to Supervisor?"
      footerLinkLabel="Create an account"
      footerTo={buildAuthPathWithReturnTo('/signup', returnTo)}
      title={returnTo ? 'Sign in to continue' : 'Sign in'}
    >
      <LoginForm />
    </AuthPageFrame>
  )
}

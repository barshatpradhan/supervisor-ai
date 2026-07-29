import { useLocation } from 'react-router-dom'
import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { RegisterForm } from '../features/auth/components/RegisterForm'
import {
  buildAuthPathWithReturnTo,
  getReturnToFromSearch,
} from '../features/invitations/utils/invitationNavigation'

export function SignupPage() {
  const location = useLocation()
  const returnTo = getReturnToFromSearch(location.search)
  return (
    <AuthPageFrame
      footerLabel="Already have an account?"
      footerLinkLabel="Sign in"
      footerTo={buildAuthPathWithReturnTo('/login', returnTo)}
      title={returnTo ? 'Create account to continue' : 'Create your organization account'}
    >
      <RegisterForm helperText={returnTo ? 'Create your account identity, then return to the invitation to join the organization workspace.' : 'Create an account first. You can then create your organization workspace.'} />
    </AuthPageFrame>
  )
}

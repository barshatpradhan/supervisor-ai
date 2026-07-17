import { useLocation } from 'react-router-dom'
import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { RegisterForm } from '../features/auth/components/RegisterForm'
import { SignupForm } from '../features/auth/components/SignupForm'
import {
  buildAuthPathWithReturnTo,
  getReturnToFromSearch,
  isInvitationReturnToPath,
} from '../features/invitations/utils/invitationNavigation'

export function SignupPage() {
  const location = useLocation()
  const returnTo = getReturnToFromSearch(location.search)
  const isInvitationRegistration = isInvitationReturnToPath(returnTo)

  return (
    <AuthPageFrame
      footerLabel="Already have an account?"
      footerLinkLabel="Sign in"
      footerTo={buildAuthPathWithReturnTo('/login', returnTo)}
      maxWidthClassName={isInvitationRegistration ? 'max-w-md' : 'max-w-6xl'}
      title={isInvitationRegistration ? 'Create account to continue' : 'Create account'}
    >
      {isInvitationRegistration ? (
        <RegisterForm helperText="Create your account identity, then return to the invitation to join the organization workspace." />
      ) : (
        <SignupForm />
      )}
    </AuthPageFrame>
  )
}

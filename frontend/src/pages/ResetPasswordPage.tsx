import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm'

function getRecoveryAccessToken() {
  return new URLSearchParams(window.location.hash.slice(1)).get('access_token')
}

export function ResetPasswordPage() {
  return <AuthPageFrame footerLabel="Ready to continue?" footerLinkLabel="Sign in" footerTo="/login" title="Choose a new password"><ResetPasswordForm accessToken={getRecoveryAccessToken()} /></AuthPageFrame>
}

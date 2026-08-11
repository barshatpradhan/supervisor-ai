import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { ForgotPasswordForm } from '../features/auth/components/ForgotPasswordForm'

export function ForgotPasswordPage() {
  return <AuthPageFrame footerLabel="Remembered your password?" footerLinkLabel="Sign in" footerTo="/login" title="Reset your password"><ForgotPasswordForm /></AuthPageFrame>
}

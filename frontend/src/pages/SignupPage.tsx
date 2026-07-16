import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { SignupForm } from '../features/auth/components/SignupForm'

export function SignupPage() {
  return (
    <AuthPageFrame
      footerLabel="Already have an account?"
      footerLinkLabel="Sign in"
      footerTo="/login"
      maxWidthClassName="max-w-6xl"
      title="Create account"
    >
      <SignupForm />
    </AuthPageFrame>
  )
}

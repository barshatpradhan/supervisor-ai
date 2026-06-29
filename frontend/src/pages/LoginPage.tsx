import { AuthPageFrame } from '../features/auth/components/AuthPageFrame'
import { LoginForm } from '../features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <AuthPageFrame
      footerLabel="New to Supervisor?"
      footerLinkLabel="Create an account"
      footerTo="/signup"
      title="Sign in"
    >
      <LoginForm />
    </AuthPageFrame>
  )
}

import { Outlet } from 'react-router-dom'
import { SiteFooter } from '../components/layout/SiteFooter'

/** Wraps the signed-out pages (sign in, sign up, invitations, not found) so each ends with the site footer. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}

import { Outlet } from 'react-router-dom'

/**
 * App shell with top nav bar. Renders the active page via <Outlet />.
 * Future phases will add nav links for SeedLab, Gallery, Arena, etc.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-bg-deep">
      <Outlet />
    </div>
  )
}

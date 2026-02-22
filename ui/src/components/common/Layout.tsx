import { Outlet, NavLink } from 'react-router-dom'

/**
 * App shell — top nav bar + page content via <Outlet />.
 */
export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-text-primary' : 'text-text-dim hover:text-text-primary'
    }`

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col">
      <nav className="border-b border-border-custom bg-bg-card px-6 py-3 flex items-center gap-6 shrink-0">
        <NavLink to="/" className="text-accent font-bold text-lg tracking-wider">
          BABEL
        </NavLink>
        <div className="flex gap-4">
          <NavLink to="/" end className={linkClass}>
            Seed Lab
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
        </div>
      </nav>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}

import { Outlet, NavLink } from 'react-router-dom'

/**
 * App shell — top nav bar + page content via <Outlet />.
 * bg-bg-deep intentionally removed from the root div — body handles
 * the background so the fixed StarField canvas shows through.
 */
export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-text-primary' : 'text-text-dim hover:text-text-primary'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border-custom bg-bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center gap-6 shrink-0">
        {/* Orbitron wordmark */}
        <NavLink
          to="/"
          className="font-display font-black tracking-widest text-accent text-base hover:text-accent/80 transition-colors"
          style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.6)' }}
        >
          BABEL
        </NavLink>
        <div className="flex gap-4">
          <NavLink to="/" end className={linkClass}>
            Seed Lab
          </NavLink>
          <NavLink to="/gallery" className={linkClass}>
            Gallery
          </NavLink>
          <NavLink to="/arena" className={linkClass}>
            Arena
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

import { Outlet, NavLink } from 'react-router-dom'

/**
 * App shell — top nav bar + page content via <Outlet />.
 * bg-bg-deep intentionally removed from the root div — body handles
 * the background so the fixed StarField canvas shows through.
 */
export function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `font-mono text-[10px] tracking-widest uppercase transition-colors ${
      isActive ? 'text-text-primary' : 'text-text-dim hover:text-text-primary'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border-custom bg-bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center gap-8 shrink-0">
        {/* Orbitron wordmark — animated gradient shimmer */}
        <NavLink
          to="/"
          className="font-display font-black tracking-widest text-base"
          style={{
            background: 'linear-gradient(90deg, #8b5cf6, #06B6D4, #F59E0B, #8b5cf6)',
            backgroundSize: '300% 300%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'babel-shimmer 6s ease infinite',
          }}
        >
          BABEL
        </NavLink>

        {/* Separator */}
        <span className="text-border-custom text-xs select-none">|</span>

        <div className="flex gap-6 items-center">
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

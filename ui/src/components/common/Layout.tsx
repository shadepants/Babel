import { useState, useEffect, CSSProperties } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * App shell — animated page transitions via AnimatePresence + Outlet key,
 * and a periodic BABEL wordmark glitch effect.
 */
export function Layout() {
  const location = useLocation()

  // ── BABEL glitch ─────────────────────────────────────────────────────────
  // Every 9–22s, run 4 rapid style frames that simulate chromatic aberration.
  const [glitchStyle, setGlitchStyle] = useState<CSSProperties>({})

  useEffect(() => {
    const glitchFrames: CSSProperties[] = [
      { transform: 'translate(-4px, 0) skewX(-3deg)', filter: 'hue-rotate(130deg) brightness(1.6)' },
      { transform: 'translate(3px, 1px) skewX(2deg)',  filter: 'hue-rotate(-75deg)' },
      { transform: 'translate(-2px, 0)',               filter: 'hue-rotate(45deg) brightness(1.3)' },
      { transform: 'translate(1px, 0)',                filter: 'none' },
      {},
    ]

    let frameTimeout: ReturnType<typeof setTimeout>
    let scheduleTimeout: ReturnType<typeof setTimeout>

    const runGlitch = () => {
      let fi = 0
      const step = () => {
        setGlitchStyle(glitchFrames[fi] ?? {})
        fi++
        if (fi < glitchFrames.length) {
          frameTimeout = setTimeout(step, 42)
        } else {
          setGlitchStyle({})
          scheduleGlitch()
        }
      }
      step()
    }

    const scheduleGlitch = () => {
      scheduleTimeout = setTimeout(runGlitch, 9000 + Math.random() * 13000)
    }

    // Also trigger immediately when Theater dispatches a turn-arrival event
    const handleBabelGlitch = () => {
      clearTimeout(frameTimeout)
      clearTimeout(scheduleTimeout)
      runGlitch()
    }
    window.addEventListener('babel-glitch', handleBabelGlitch)

    scheduleGlitch()
    return () => {
      clearTimeout(frameTimeout)
      clearTimeout(scheduleTimeout)
      window.removeEventListener('babel-glitch', handleBabelGlitch)
    }
  }, [])

  // ── Nav ───────────────────────────────────────────────────────────────────
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `font-mono text-[10px] tracking-widest uppercase transition-colors ${
      isActive ? 'text-text-primary' : 'text-text-dim hover:text-text-primary'
    }`

  const babelBaseStyle: CSSProperties = {
    background: 'linear-gradient(90deg, #8b5cf6, #06B6D4, #F59E0B, #8b5cf6)',
    backgroundSize: '300% 300%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'babel-shimmer 6s ease infinite',
    transition: 'filter 0.05s, transform 0.05s',
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border-custom bg-bg-card/80 backdrop-blur-sm px-6 py-3 flex items-center gap-8 shrink-0">
        {/* BABEL wordmark — shimmer + periodic glitch */}
        <NavLink
          to="/"
          className="font-display font-black tracking-widest text-base"
          style={{ ...babelBaseStyle, ...glitchStyle }}
        >
          BABEL
        </NavLink>

        <span className="text-border-custom text-xs select-none">|</span>

        <div className="flex gap-6 items-center">
          <NavLink to="/" end className={linkClass}>Seed Lab</NavLink>
          <NavLink to="/gallery"  className={linkClass}>Gallery</NavLink>
          <NavLink to="/arena"    className={linkClass}>Arena</NavLink>
          <NavLink to="/settings" className={linkClass}>Settings</NavLink>
        </div>
      </nav>

      {/* Animated page transitions — key change on route causes exit/enter */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.20, ease: 'easeOut' }}
          className="flex-1 flex flex-col"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

/**
 * ScrambleText — cycles through ASCII chars before resolving the real text
 * left-to-right. Triggers once on mount (each route navigation).
 *
 * Only uses ASCII printable chars so no font-fallback flickering occurs
 * regardless of which font the parent element uses.
 */

// Pure ASCII — safe in Orbitron, JetBrains Mono, Inter, any font
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&?*+-=/<>^~'

export function ScrambleText({
  children,
  duration = 2000,
  className,
}: {
  children: string
  duration?: number
  className?: string
}) {
  // Start fully scrambled so the reveal begins immediately on mount
  const [display, setDisplay] = useState(() =>
    children.split('').map((c) =>
      c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    ).join('')
  )

  const frameRef   = useRef<number>()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const target    = children
    const startTime = performance.now()

    const tick = (now: number) => {
      if (!mountedRef.current) return
      const progress = Math.min((now - startTime) / duration, 1)

      const result = target.split('').map((char, i) => {
        if (char === ' ') return ' '
        // Left-to-right stagger: char i locks in as progress passes its threshold
        const threshold = (i / Math.max(target.length - 1, 1)) * 0.68
        if (progress >= threshold + 0.32) return char
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      })

      setDisplay(result.join(''))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      mountedRef.current = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [children, duration])

  return <span className={className}>{display}</span>
}

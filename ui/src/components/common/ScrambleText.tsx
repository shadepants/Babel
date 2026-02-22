import { useState, useEffect, useRef } from 'react'

/**
 * ScrambleText — cycles through geometric glyphs + random chars before
 * resolving to the real text, left-to-right stagger.
 * Triggers once on mount (i.e., each time the page is navigated to).
 */

const GLYPHS = '◈⬡◉✦⊕⟡⌬◇⊗⧖XZKQVBNMRPSTLDHFWYJGCAEIOUBCDEFGHIJKLMNOPQRSTUVWXYZ019284375!@#%'

export function ScrambleText({
  children,
  duration = 1050,
  className,
}: {
  children: string
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(() => {
    // Start with scrambled — immediate scramble on first render
    return children.split('').map((c) =>
      c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    ).join('')
  })

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
        // stagger: char i resolves when progress passes its threshold
        // first char resolves early, last char at ~75% of duration
        const threshold = (i / Math.max(target.length - 1, 1)) * 0.72
        if (progress >= threshold + 0.28) return char
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

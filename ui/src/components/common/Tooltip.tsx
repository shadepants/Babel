import { useState, useEffect, useRef, useCallback } from 'react'

interface TooltipProps {
  /** Tooltip body — plain string or JSX */
  content: React.ReactNode
  /** Trigger label (default: '?') */
  label?: string
  /** Extra class on the trigger chip */
  className?: string
}

/** Custom event fired when a tooltip opens — lets others close themselves (singleton). */
const TOOLTIP_EVENT = 'babel-tooltip-open'

/**
 * Click-to-pin tooltip.
 * - One open at a time (global singleton via custom event).
 * - Outside click or Escape dismisses.
 * - Keyboard accessible (Enter / Space to toggle).
 */
export function Tooltip({ content, label = '?', className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const uid = useRef(`tt-${Math.random().toString(36).slice(2)}`)
  const wrapRef = useRef<HTMLSpanElement>(null)

  // Close when another tooltip opens
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== uid.current) setOpen(false)
    }
    window.addEventListener(TOOLTIP_EVENT, handler)
    return () => window.removeEventListener(TOOLTIP_EVENT, handler)
  }, [])

  // Outside-click dismiss
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Escape dismiss
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const toggle = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next) {
      window.dispatchEvent(new CustomEvent<string>(TOOLTIP_EVENT, { detail: uid.current }))
    }
  }, [open])

  return (
    <span ref={wrapRef} className="relative inline-block leading-none align-middle">
      {/* Trigger chip */}
      <span
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label="Show help"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
        }}
        className={[
          'font-mono text-[9px] border px-1 py-0.5 rounded-sm cursor-pointer select-none transition-colors',
          open
            ? 'border-accent/60 text-accent bg-accent/10'
            : 'border-border-custom/40 text-text-dim/40 hover:border-accent/40 hover:text-accent/60',
          className,
        ].join(' ')}
      >
        {label}
      </span>

      {/* Panel */}
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-2 w-64 block"
        >
          {/* Arrow */}
          <span
            aria-hidden="true"
            className="absolute -top-[5px] left-3 w-2.5 h-2.5 rotate-45 block"
            style={{
              background: 'rgba(8,12,28,0.97)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRight: 'none',
              borderBottom: 'none',
            }}
          />
          <span
            className="block rounded-sm overflow-hidden shadow-xl shadow-black/70"
            style={{
              background: 'rgba(8,12,28,0.97)',
              border: '1px solid rgba(139,92,246,0.25)',
              backdropFilter: 'blur(14px)',
            }}
          >
            {/* Gradient top bar */}
            <span className="neural-card-bar block" />
            <span className="block p-3 font-mono text-[10px] text-text-dim leading-relaxed tracking-wide normal-case">
              {content}
            </span>
          </span>
        </span>
      )}
    </span>
  )
}

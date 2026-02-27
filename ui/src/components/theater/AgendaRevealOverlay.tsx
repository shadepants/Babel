import { useState, useEffect, useRef, useCallback } from 'react'

interface HiddenGoal {
  agent_index: number
  goal: string
}

interface AgendaRevealOverlayProps {
  goals: HiddenGoal[] | null   // null = don't show
  agentNames: string[]
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 6000
const STAGGER_MS = 350

// Alternating amber/cyan palette for agent cards
const CARD_COLORS = ['#F59E0B', '#06B6D4', '#A78BFA', '#F472B6', '#38BDF8', '#FB923C']

/**
 * Full-screen dramatic overlay revealing hidden agendas at experiment end.
 * Cards appear one-by-one with staggered animation.
 * Auto-dismisses after 6 seconds; click or Escape dismisses early.
 * Traps focus and manages return-focus for accessibility.
 */
export function AgendaRevealOverlay({
  goals,
  agentNames,
  onDismiss,
}: AgendaRevealOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const stableDismiss = useCallback(onDismiss, [onDismiss])
  // Track which cards have become visible (staggered reveal)
  const [visibleCount, setVisibleCount] = useState(0)
  // Flash state for glitch effect on title
  const [glitch, setGlitch] = useState(false)

  const count = goals?.length ?? 0

  // Reset visibility when goals change (new reveal)
  useEffect(() => {
    if (!goals) {
      setVisibleCount(0)
      return
    }
    // Stagger card reveals
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => setVisibleCount(i + 1), i * STAGGER_MS))
    }
    return () => timers.forEach(clearTimeout)
  }, [goals, count])

  // Auto-dismiss
  useEffect(() => {
    if (!goals) return
    const t = setTimeout(stableDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [goals, stableDismiss])

  // Focus management: save previous focus, move into dialog, restore on close
  useEffect(() => {
    if (!goals) return
    previousFocusRef.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()
    return () => { previousFocusRef.current?.focus() }
  }, [goals])

  // Escape key to dismiss
  useEffect(() => {
    if (!goals) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') stableDismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [goals, stableDismiss])

  // Glitch effect on title: fire twice quickly after mount
  useEffect(() => {
    if (!goals) return
    const t1 = setTimeout(() => setGlitch(true),  80)
    const t2 = setTimeout(() => setGlitch(false), 200)
    const t3 = setTimeout(() => setGlitch(true),  420)
    const t4 = setTimeout(() => setGlitch(false), 520)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [goals])

  if (!goals) return null

  return (
    /* Full-screen backdrop */
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Agendas Revealed"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(2, 8, 23, 0.88)',
        backdropFilter: 'blur(6px)',
        overscrollBehavior: 'contain',
        outline: 'none',
      }}
      onClick={stableDismiss}
    >
      {/* Prevent click-through on inner content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', width: '100%', maxWidth: '640px', padding: '0 24px' }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div
            className="font-display font-black uppercase"
            style={{
              fontSize: '28px',
              letterSpacing: '0.2em',
              color: glitch ? '#06B6D4' : '#F59E0B',
              textShadow: glitch
                ? '2px 0 8px #F59E0B, -2px 0 8px #06B6D4'
                : '0 0 32px #F59E0B88',
              transition: 'color 0.05s, text-shadow 0.05s',
            }}
          >
            Agendas Revealed
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, Fira Mono, monospace',
              fontSize: '10px',
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.35)',
              marginTop: '6px',
              textTransform: 'uppercase',
            }}
          >
            Hidden objectives &mdash; now exposed
          </div>
        </div>

        {/* Agent cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {goals.map((g, i) => {
            const visible = i < visibleCount
            const accentColor = CARD_COLORS[g.agent_index % CARD_COLORS.length]
            const agentName = agentNames[g.agent_index] ?? `Agent ${g.agent_index + 1}`

            return (
              <div
                key={g.agent_index}
                className={visible ? 'animate-fade-in' : ''}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(16px)',
                  transition: 'opacity 0.35s ease, transform 0.35s ease',
                  background: 'rgba(5, 8, 20, 0.95)',
                  border: `1px solid ${accentColor}33`,
                  borderLeft: `3px solid ${accentColor}`,
                  borderRadius: '8px',
                  padding: '14px 18px',
                  boxShadow: `0 0 20px ${accentColor}11`,
                }}
              >
                {/* Agent label */}
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, Fira Mono, monospace',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: accentColor,
                    marginBottom: '6px',
                  }}
                >
                  {agentName}
                </div>

                {/* Goal text */}
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.55',
                    color: 'rgba(226, 232, 240, 0.9)',
                  }}
                >
                  {g.goal}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dismiss hint */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, Fira Mono, monospace',
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.22)',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
          onClick={stableDismiss}
        >
          Click anywhere or press Esc to dismiss
        </div>
      </div>
    </div>
  )
}

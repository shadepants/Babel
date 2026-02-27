import { useState, useEffect } from 'react'
import { HudBrackets } from '@/components/common/HudBrackets'

interface EchoChamberWarningProps {
  similarity: number        // 0.0 - 1.0
  interventionFired: boolean
  onDismiss: () => void
}

const AMBER = '#F59E0B'
const RED = '#EF4444'
const AUTO_DISMISS_MS = 8000
const INTERVENTION_FLASH_MS = 1500
const INTERVENTION_THRESHOLD = 0.88

/**
 * Amber HUD warning panel that appears when vocabulary convergence is detected.
 * Absolute-positioned top-right of the Theater container.
 * Auto-dismisses after 8 seconds; click dismisses early.
 * At similarity >= 0.88 flashes "INTERVENTION INJECTED" for 1.5s.
 */
export function EchoChamberWarning({
  similarity,
  interventionFired,
  onDismiss,
}: EchoChamberWarningProps) {
  const [showIntervention, setShowIntervention] = useState(false)

  // Auto-dismiss timer
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [onDismiss])

  // Flash "INTERVENTION INJECTED" when threshold is crossed
  useEffect(() => {
    if (!interventionFired || similarity < INTERVENTION_THRESHOLD) return
    setShowIntervention(true)
    const t = setTimeout(() => setShowIntervention(false), INTERVENTION_FLASH_MS)
    return () => clearTimeout(t)
  }, [interventionFired, similarity])

  const pct = Math.round(similarity * 100)

  // Bar color: amber below threshold, red at/above
  const barColor = similarity >= INTERVENTION_THRESHOLD ? RED : AMBER

  return (
    <div
      role="alert"
      aria-live="assertive"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); onDismiss() } }}
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 40,
        width: '220px',
        background: 'rgba(5, 8, 20, 0.92)',
        border: `1px solid ${AMBER}44`,
        borderRadius: '8px',
        padding: '12px 14px',
        cursor: 'pointer',
        boxShadow: `0 0 24px ${AMBER}22`,
      }}
    >
      {/* HUD corner brackets */}
      <div style={{ position: 'relative' }}>
        <HudBrackets color={AMBER} size={8} thickness={1.5} />

        {/* Header */}
        <div
          className="animate-pulse-slow"
          style={{
            fontFamily: 'JetBrains Mono, Fira Mono, monospace',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: AMBER,
            marginBottom: '8px',
          }}
        >
          &#9650; Convergence Detected
        </div>

        {/* Similarity bar background */}
        <div
          style={{
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          {/* Filled portion */}
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: '3px',
              background: barColor,
              boxShadow: `0 0 8px ${barColor}80`,
              transition: 'width 0.4s ease, background 0.3s ease, box-shadow 0.3s ease',
            }}
          />
        </div>

        {/* Similarity label */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, Fira Mono, monospace',
            fontSize: '9px',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.06em',
          }}
        >
          Vocabulary overlap: {pct}%
        </div>

        {/* Intervention flash */}
        {showIntervention && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '8px',
              fontFamily: 'JetBrains Mono, Fira Mono, monospace',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: RED,
              textShadow: `0 0 8px ${RED}`,
            }}
          >
            &#9679; Intervention Injected
          </div>
        )}

        {/* Dismiss hint */}
        <div
          style={{
            marginTop: '8px',
            fontFamily: 'JetBrains Mono, Fira Mono, monospace',
            fontSize: '8px',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.06em',
          }}
        >
          Click to dismiss
        </div>
      </div>
    </div>
  )
}

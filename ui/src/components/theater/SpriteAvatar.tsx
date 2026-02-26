import { useState, useEffect, useId } from 'react'

export type SpriteStatus = 'idle' | 'thinking' | 'talking' | 'error' | 'winner' | 'loser'

interface SpriteAvatarProps {
  status: SpriteStatus
  /** Legacy 2-color prop; if accentColor is provided, this is only used for aria-label fallback */
  color?: 'model-a' | 'model-b'
  /** Phase 15-A: explicit hex color overriding the color-derived palette */
  accentColor?: string
  /** Unique id suffix for SVG clipPath to avoid DOM collisions with multiple sprites */
  instanceId?: string
  size?: number
}

const AMBER = '#F59E0B'
const CYAN  = '#06B6D4'
const RED   = '#EF4444'
const GOLD  = '#FCD34D'

/**
 * Neural HUD avatar — a crystalline circuit-board face that reacts to relay state.
 * idle=float+blink, thinking=scan bar, talking=eye pulse, error=X+shake,
 * winner=glow burst, loser=dim+shake.
 */
export function SpriteAvatar({ status, color, accentColor, instanceId, size = 64 }: SpriteAvatarProps) {
  const [blinking, setBlinking] = useState(false)
  const generatedId = useId().replace(/:/g, '')
  const clipId = `face-clip-${instanceId ?? generatedId}`

  useEffect(() => {
    if (status !== 'idle') { setBlinking(false); return }
    let alive = true
    const loop = () => {
      const delay = Math.random() * 4000 + 2000
      setTimeout(() => {
        if (!alive) return
        setBlinking(true)
        setTimeout(() => { if (alive) setBlinking(false) }, 150)
        loop()
      }, delay)
    }
    loop()
    return () => { alive = false }
  }, [status])

  const accent    = accentColor ?? (color === 'model-b' ? CYAN : AMBER)
  const eyeColor  = status === 'error' || status === 'loser' ? RED : status === 'winner' ? GOLD : accent
  const wrapClass = status === 'idle' ? 'sprite-float'
    : status === 'error' || status === 'loser' ? 'sprite-shake'
    : status === 'winner' ? 'sprite-win'
    : ''
  const eyeClass  = status === 'talking' ? 'sprite-talk-eye' : ''
  const opacity   = status === 'loser' ? 0.45 : 1

  const h = Math.round(size * 72 / 64)

  return (
    <div className={wrapClass} style={{ display: 'inline-block', lineHeight: 0, opacity }}>
      <svg
        viewBox="0 0 64 72"
        width={size}
        height={h}
        style={{ shapeRendering: 'crispEdges', overflow: 'visible' }}
        aria-label={`${color ? (color === 'model-a' ? 'Model A' : 'Model B') : 'Agent'} avatar — ${status}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="8" y="14" width="48" height="44" />
          </clipPath>
        </defs>

        {/* Antenna */}
        <rect x="29" y="0" width="6" height="10" fill={accent} opacity="0.85" />
        <rect x="24" y="0" width="16" height="3"  fill={accent} opacity="0.85" />
        {/* Antenna tip glow */}
        <circle cx="32" cy="1" r="2" fill={accent} opacity="0.6" />

        {/* Outer head — hard pixel frame */}
        <rect x="3" y="10" width="58" height="54" fill="#0a0f1e" stroke={accent} strokeWidth="2" />

        {/* Inner face plate */}
        <rect x="8" y="14" width="48" height="44" fill="#111827" />

        {/* Corner circuit details */}
        <rect x="8"  y="14" width="6" height="2" fill={accent} opacity="0.5" />
        <rect x="8"  y="14" width="2" height="6" fill={accent} opacity="0.5" />
        <rect x="50" y="14" width="6" height="2" fill={accent} opacity="0.5" />
        <rect x="54" y="14" width="2" height="6" fill={accent} opacity="0.5" />
        <rect x="8"  y="54" width="6" height="2" fill={accent} opacity="0.5" />
        <rect x="8"  y="50" width="2" height="6" fill={accent} opacity="0.5" />
        <rect x="50" y="54" width="6" height="2" fill={accent} opacity="0.5" />
        <rect x="54" y="50" width="2" height="6" fill={accent} opacity="0.5" />

        {/* Left eye */}
        <rect
          x="11" y="24" width="16" height="10"
          fill={eyeColor}
          opacity={blinking ? 0.04 : 0.85}
          className={eyeClass}
          style={{ transformOrigin: '19px 29px' }}
        />
        {/* Left eye inner highlight */}
        <rect x="13" y="26" width="4" height="3" fill="white" opacity={blinking ? 0 : 0.25} />

        {/* Right eye */}
        <rect
          x="37" y="24" width="16" height="10"
          fill={eyeColor}
          opacity={blinking ? 0.04 : 0.85}
          className={eyeClass}
          style={{ transformOrigin: '45px 29px' }}
        />
        {/* Right eye inner highlight */}
        <rect x="39" y="26" width="4" height="3" fill="white" opacity={blinking ? 0 : 0.25} />

        {/* Mouth — segmented pixel bar */}
        <rect x="14" y="44" width="36" height="4" fill={accent} opacity={status === 'error' || status === 'loser' ? 0.2 : 0.5} />
        {/* Mouth segments */}
        {status !== 'error' && status !== 'loser' && (
          <>
            <rect x="14" y="44" width="6"  height="4" fill={accent} opacity="0.7" />
            <rect x="22" y="44" width="6"  height="4" fill={accent} opacity="0.5" />
            <rect x="30" y="44" width="6"  height="4" fill={accent} opacity="0.7" />
            <rect x="38" y="44" width="6"  height="4" fill={accent} opacity="0.5" />
            <rect x="44" y="44" width="6"  height="4" fill={accent} opacity="0.7" />
          </>
        )}
        {/* Mouth corner ticks */}
        <rect x="11" y="46" width="3" height="2" fill={accent} opacity="0.35" />
        <rect x="50" y="46" width="3" height="2" fill={accent} opacity="0.35" />

        {/* Outer glow ring when active */}
        {(status === 'thinking' || status === 'talking') && (
          <rect x="1" y="8" width="62" height="58" fill="none" stroke={accent} strokeWidth="1" opacity="0.3" />
        )}
        {status === 'winner' && (
          <>
            <rect x="1" y="8" width="62" height="58" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.6" />
            <rect x="-1" y="6" width="66" height="62" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.25" />
          </>
        )}

        {/* Thinking: scanning light bar */}
        {status === 'thinking' && (
          <rect
            x="8" y="14" width="20" height="44"
            fill={accent} opacity="0"
            className="sprite-scan-bar"
            clipPath={`url(#${clipId})`}
          />
        )}

        {/* Error / loser: X marks over eyes */}
        {(status === 'error' || status === 'loser') && (
          <>
            <line x1="11" y1="24" x2="27" y2="34" stroke={RED} strokeWidth="2" />
            <line x1="27" y1="24" x2="11" y2="34" stroke={RED} strokeWidth="2" />
            <line x1="37" y1="24" x2="53" y2="34" stroke={RED} strokeWidth="2" />
            <line x1="53" y1="24" x2="37" y2="34" stroke={RED} strokeWidth="2" />
          </>
        )}

        {/* Winner: sparkle diamonds radiating from head/shoulders */}
        {status === 'winner' && (
          <g aria-hidden="true">
            <polygon points="32,3 34,8 32,13 30,8"   className="sprite-spark sprite-spark--1" style={{ fill: GOLD }} />
            <polygon points="52,12 54,17 52,22 50,17" className="sprite-spark sprite-spark--2" style={{ fill: GOLD }} />
            <polygon points="12,12 14,17 12,22 10,17" className="sprite-spark sprite-spark--3" style={{ fill: GOLD }} />
            <polygon points="57,32 59,37 57,42 55,37" className="sprite-spark sprite-spark--4" style={{ fill: GOLD }} />
            <polygon points=" 7,32  9,37  7,42  5,37" className="sprite-spark sprite-spark--5" style={{ fill: GOLD }} />
          </g>
        )}

        {/* Loser: falling fragments below feet */}
        {status === 'loser' && (
          <g aria-hidden="true">
            <rect x="23" y="62" width="4" height="4" rx="0.5" className="sprite-fragment sprite-fragment--1" style={{ fill: accent, opacity: 0.5 }} />
            <rect x="31" y="64" width="3" height="3" rx="0.5" className="sprite-fragment sprite-fragment--2" style={{ fill: accent, opacity: 0.4 }} />
            <rect x="38" y="61" width="3" height="3" rx="0.5" className="sprite-fragment sprite-fragment--3" style={{ fill: accent, opacity: 0.35 }} />
          </g>
        )}
      </svg>
    </div>
  )
}

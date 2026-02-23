import type { TurnEvent, ScoreEvent } from '@/api/types'
import { cn } from '@/lib/utils'
import { TypewriterText } from './TypewriterText'

interface TurnBubbleProps {
  turn: TurnEvent
  color: 'model-a' | 'model-b'
  score?: ScoreEvent
  /** True only for the single latest turn — enables typewriter reveal */
  isLatest?: boolean
}

/**
 * Single conversation turn — terminal log style.
 * Left-stripe accent, scanline texture, typewriter reveal for latest turn.
 */
export function TurnBubble({ turn, color, score, isLatest }: TurnBubbleProps) {
  const isA       = color === 'model-a'
  const accent    = isA ? '#F59E0B' : '#06B6D4'
  const dimAccent = isA ? 'rgba(245,158,11,0.18)' : 'rgba(6,182,212,0.18)'
  const borderTop = isA ? 'rgba(245,158,11,0.12)' : 'rgba(6,182,212,0.12)'

  return (
    <div
      className="animate-fade-in"
      style={{
        borderLeft: `3px solid ${accent}`,
        borderTop: `1px solid ${borderTop}`,
        borderRight: `1px solid ${borderTop}`,
        borderBottom: `1px solid ${borderTop}`,
        borderRadius: '2px',
        background: `linear-gradient(90deg, ${dimAccent} 0%, rgba(10,15,30,0.7) 18%)`,
        backgroundImage: [
          `linear-gradient(90deg, ${dimAccent} 0%, rgba(10,15,30,0.7) 18%)`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.007) 2px, rgba(255,255,255,0.007) 3px)',
        ].join(', '),
        padding: '8px 12px',
      }}
    >
      {/* Header: round tag + latency */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[9px] tracking-wider uppercase"
          style={{ color: accent, opacity: 0.65 }}
        >
          [R.{turn.round}]
        </span>
        <span className="font-mono text-[9px] text-text-dim/40 tabular-nums">
          {turn.latency_s}s
        </span>
      </div>

      {/* Content — JetBrains Mono */}
      <div className="font-mono text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
        <TypewriterText text={turn.content} active={!!isLatest} />
      </div>

      {/* Score badges */}
      {score && (
        <div className="mt-3 pt-2 animate-fade-in" style={{ borderTop: `1px solid ${borderTop}` }}>
          <div className="flex gap-4 flex-wrap">
            <ScorePill label="creativity" value={score.creativity} color="#F59E0B" />
            <ScorePill label="coherence"  value={score.coherence}  color="#06B6D4" />
            <ScorePill label="engagement" value={score.engagement} color="#34D399" />
            <ScorePill label="novelty"    value={score.novelty}    color="#A78BFA" />
          </div>
        </div>
      )}
    </div>
  )
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('font-mono text-xs font-semibold tabular-nums')} style={{ color }}>
        {value.toFixed(2)}
      </span>
      <span className="font-mono text-[8px] text-text-dim/40 tracking-wider uppercase">{label}</span>
    </div>
  )
}

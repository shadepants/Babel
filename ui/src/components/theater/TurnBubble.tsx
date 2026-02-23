import type { TurnEvent, ScoreEvent } from '@/api/types'
import { cn } from '@/lib/utils'

interface TurnBubbleProps {
  turn: TurnEvent
  color: 'model-a' | 'model-b'
  score?: ScoreEvent
}

/**
 * A single conversation turn rendered as a card.
 * Color-coded by model identity (amber for A, cyan for B).
 * Shows async judge scores below content once they arrive.
 */
export function TurnBubble({ turn, color, score }: TurnBubbleProps) {
  const borderColor = color === 'model-a' ? 'border-model-a/30' : 'border-model-b/30'
  const badgeBg = color === 'model-a' ? 'bg-model-a/20 text-model-a' : 'bg-model-b/20 text-model-b'
  const glowShadow = color === 'model-a'
    ? '0 0 12px rgba(245, 158, 11, 0.15)'
    : '0 0 12px rgba(6, 182, 212, 0.15)'

  return (
    <div
      className={cn(
        'rounded-lg border bg-bg-card p-4 animate-fade-in transition-shadow',
        borderColor,
      )}
      style={{ boxShadow: glowShadow }}
    >
      {/* Header: round badge + latency */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badgeBg)}>
          Round {turn.round}
        </span>
        <span className="text-xs text-text-dim">
          {turn.latency_s}s
        </span>
      </div>

      {/* Content: JetBrains Mono — machine output deserves machine type */}
      <div className="font-mono text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
        {turn.content}
      </div>

      {/* Score badge — appears asynchronously after judge model scores the turn */}
      {score && (
        <div className="mt-3 pt-2.5 border-t border-border-custom/30 animate-fade-in">
          <div className="flex gap-3 flex-wrap">
            <ScorePill label="creativity" value={score.creativity} color="text-model-a" />
            <ScorePill label="coherence" value={score.coherence} color="text-model-b" />
            <ScorePill label="engagement" value={score.engagement} color="text-emerald-400" />
            <ScorePill label="novelty" value={score.novelty} color="text-purple-400" />
          </div>
        </div>
      )}
    </div>
  )
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('font-mono text-xs font-semibold tabular-nums', color)}>
        {value.toFixed(2)}
      </span>
      <span className="font-mono text-[8px] text-text-dim/50 tracking-wider uppercase">{label}</span>
    </div>
  )
}

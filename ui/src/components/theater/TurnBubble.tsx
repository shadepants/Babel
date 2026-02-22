import type { TurnEvent } from '@/api/types'
import { cn } from '@/lib/utils'

interface TurnBubbleProps {
  turn: TurnEvent
  color: 'model-a' | 'model-b'
}

/**
 * A single conversation turn rendered as a card.
 * Color-coded by model identity (indigo for A, amber for B).
 */
export function TurnBubble({ turn, color }: TurnBubbleProps) {
  const borderColor = color === 'model-a' ? 'border-model-a/30' : 'border-model-b/30'
  const badgeBg = color === 'model-a' ? 'bg-model-a/20 text-model-a' : 'bg-model-b/20 text-model-b'

  return (
    <div
      className={cn(
        'rounded-lg border bg-bg-card p-4 animate-fade-in',
        borderColor,
      )}
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

      {/* Content: preserve whitespace from model output */}
      <div className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
        {turn.content}
      </div>
    </div>
  )
}

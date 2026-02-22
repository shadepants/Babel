import type { ExperimentState } from '@/api/hooks'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ExperimentHeaderProps {
  modelA: string
  modelB: string
  state: ExperimentState
  connected: boolean
}

/**
 * Top bar showing model names, status, round progress, and connection state.
 */
export function ExperimentHeader({ modelA, modelB, state, connected }: ExperimentHeaderProps) {
  const statusColor = {
    idle: 'bg-text-dim',
    running: 'bg-info',
    completed: 'bg-success',
    error: 'bg-danger',
  }[state.status]

  const statusLabel = {
    idle: 'Idle',
    running: 'Running',
    completed: 'Completed',
    error: 'Error',
  }[state.status]

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom bg-bg-card rounded-t-lg">
      {/* Models */}
      <div className="flex items-center gap-3">
        <Badge className="bg-model-a/20 text-model-a border-model-a/30">
          {modelA}
        </Badge>
        <span className="text-text-dim text-sm">vs</span>
        <Badge className="bg-model-b/20 text-model-b border-model-b/30">
          {modelB}
        </Badge>
      </div>

      {/* Status + Progress */}
      <div className="flex items-center gap-4">
        {state.totalRounds > 0 && (
          <span className="text-sm text-text-dim">
            Round {state.currentRound} / {state.totalRounds}
          </span>
        )}

        {state.elapsed !== null && (
          <span className="text-sm text-text-dim">
            {state.elapsed}s
          </span>
        )}

        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', statusColor)} />
          <span className="text-xs text-text-dim">{statusLabel}</span>
        </div>

        {/* Connection indicator */}
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-success' : 'bg-warning animate-pulse',
          )}
          title={connected ? 'Connected' : 'Reconnecting...'}
        />
      </div>
    </div>
  )
}

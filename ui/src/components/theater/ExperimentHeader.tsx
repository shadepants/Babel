import type { ExperimentState } from '@/api/hooks'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatModelVersion } from '@/lib/models'

interface ExperimentHeaderProps {
  modelA: string
  modelB: string
  state: ExperimentState
  connected: boolean
  /** Spec 019: version string from DB (null for pre-019 experiments) */
  modelAVersion?: string | null
  modelBVersion?: string | null
}

/**
 * Top bar showing model names, status, round progress, and connection state.
 * Model badges show a version tooltip on hover when version data is available.
 */
export function ExperimentHeader({ modelA, modelB, state, connected, modelAVersion, modelBVersion }: ExperimentHeaderProps) {
  const statusColor: Record<string, string> = {
    idle: 'bg-text-dim',
    running: 'bg-info',
    paused: 'bg-warning',
    completed: 'bg-success',
    error: 'bg-danger',
  }
  const color = statusColor[state.status] || 'bg-text-dim'

  const statusLabel: Record<string, string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    completed: 'Completed',
    error: 'Error',
  }
  const label = statusLabel[state.status] || 'Unknown'

  const versionTipA = modelAVersion ? formatModelVersion(modelAVersion) : undefined
  const versionTipB = modelBVersion ? formatModelVersion(modelBVersion) : undefined

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom bg-bg-card rounded-t-lg">
      {/* Models */}
      <div className="flex items-center gap-3">
        <Badge
          className="bg-model-a/20 text-model-a border-model-a/30 cursor-default"
          title={versionTipA}
        >
          {modelA}
        </Badge>
        <span className="text-text-dim text-sm">vs</span>
        <Badge
          className="bg-model-b/20 text-model-b border-model-b/30 cursor-default"
          title={versionTipB}
        >
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
          <div className={cn('w-2 h-2 rounded-full', color)} />
          <span className="text-xs text-text-dim">{label}</span>
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

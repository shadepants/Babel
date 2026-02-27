import { useState, useEffect } from 'react'
import { HudBrackets } from '@/components/common/HudBrackets'
import { api } from '@/api/client'
import { modelDisplayName } from '@/lib/format'
import type { PairingOracleResult } from '@/api/types'

interface PairingOracleProps {
  preset: string | null
  onApply: (modelA: string, modelB: string) => void
}

/** Renders a normalized bar (0-1 value) with a label */
function MetricBar({
  label,
  value,
  color = '#8b5cf6',
}: {
  label: string
  value: number
  color?: string
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase">{label}</span>
        <span className="font-mono text-[9px]" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 bg-bg-deep/80 rounded-full overflow-hidden border border-border-custom/20">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/** Single pairing recommendation card */
function PairingCard({
  result,
  rank,
  onApply,
}: {
  result: PairingOracleResult
  rank: number
  onApply: (modelA: string, modelB: string) => void
}) {
  const { avg_chemistry: chem } = result
  // Initiative balance: how even the split is (1.0 = perfectly balanced)
  const balance = 1 - Math.abs(chem.initiative_a - chem.initiative_b)

  const rankColors: Record<number, string> = {
    1: '#f59e0b', // amber -- gold
    2: '#94a3b8', // slate -- silver
    3: '#a16207', // dark amber -- bronze
  }
  const rankColor = rankColors[rank] ?? '#6b7280'

  return (
    <div className="relative rounded-sm border border-border-custom/40 bg-bg-deep/40 p-4 space-y-3">
      <HudBrackets color={rankColor} size={8} thickness={1} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: rankColor }}>
              #{rank}
            </span>
            <span className="font-mono text-xs text-text-primary truncate">
              {modelDisplayName(result.model_a)}
            </span>
            <span className="font-mono text-[9px] text-text-dim/40">&times;</span>
            <span className="font-mono text-xs text-text-primary truncate">
              {modelDisplayName(result.model_b)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] text-text-dim/40 tracking-wider">
              Based on {result.experiment_count} experiment{result.experiment_count !== 1 ? 's' : ''}
            </span>
            {result.preset && (
              <span className="font-mono text-[8px] text-accent/40 tracking-wider">
                &middot; {result.preset}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onApply(result.model_a, result.model_b)}
          className="flex-shrink-0 font-mono text-[9px] tracking-wider uppercase border border-accent/30 hover:border-accent/70 text-accent/60 hover:text-accent px-2 py-1 rounded-sm transition-colors"
        >
          Apply &rarr;
        </button>
      </div>

      {/* Chemistry metrics */}
      <div className="space-y-1.5">
        <MetricBar label="Initiative Balance" value={balance} color="#8b5cf6" />
        <MetricBar label="Surprise Index" value={chem.surprise_index} color="#06b6d4" />
        <MetricBar label="Convergence" value={chem.convergence_rate} color="#10b981" />
      </div>
    </div>
  )
}

export function PairingOracle({ preset, onApply }: PairingOracleProps): React.ReactElement {
  const [results, setResults] = useState<PairingOracleResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    api.getPairingOracle(preset ?? undefined)
      .then((data) => {
        setResults(data.slice(0, 3))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [preset])

  if (loading) {
    return (
      <p className="font-mono text-[9px] text-text-dim/40 animate-pulse tracking-widest text-center py-3">
        // analyzing chemistry data...
      </p>
    )
  }

  if (error || results.length === 0) {
    return (
      <p className="font-mono text-[9px] text-text-dim/40 tracking-wider text-center py-3">
        // Not enough data &mdash; run more experiments to unlock recommendations
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((result, idx) => (
        <PairingCard
          key={`${result.model_a}--${result.model_b}`}
          result={result}
          rank={idx + 1}
          onApply={onApply}
        />
      ))}
    </div>
  )
}

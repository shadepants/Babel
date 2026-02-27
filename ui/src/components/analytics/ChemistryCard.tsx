import { HudBrackets } from '@/components/common/HudBrackets'
import type { CollaborationMetrics } from '@/api/types'

const MODEL_A_COLOR = '#F59E0B'
const MODEL_B_COLOR = '#06B6D4'

interface ChemistryCardProps {
  metrics: CollaborationMetrics
  agentAName: string
  agentBName: string
}

function BarSplit({ left, right, leftColor, rightColor, leftLabel, rightLabel }: {
  left: number; right: number; leftColor: string; rightColor: string
  leftLabel: string; rightLabel: string
}) {
  const leftPct = Math.round(left * 100)
  const rightPct = Math.round(right * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-text-dim mb-1">
        <span>{leftLabel} {leftPct}%</span>
        <span>{rightPct}% {rightLabel}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-bg-deep/50">
        <div
          className="transition-all duration-500"
          style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
        />
        <div
          className="transition-all duration-500"
          style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
        />
      </div>
    </div>
  )
}

function MetricGauge({ value, label, description }: {
  value: number; label: string; description: string
}) {
  const pct = Math.round(Math.abs(value) * 100)
  const isNegative = value < 0
  const color = isNegative ? MODEL_B_COLOR : MODEL_A_COLOR
  return (
    <div className="text-center">
      <div className="text-xs text-text-dim mb-1">{label}</div>
      <div className="relative h-2 rounded-full bg-bg-deep/50 overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            left: isNegative ? `${100 - pct}%` : '0%',
          }}
        />
      </div>
      <div className="text-xs text-text-dim mt-1">{description}</div>
    </div>
  )
}

export function ChemistryCard({ metrics, agentAName, agentBName }: ChemistryCardProps) {
  const convergenceLabel = metrics.convergence_rate > 0.05
    ? 'Converging'
    : metrics.convergence_rate < -0.05
      ? 'Diverging'
      : 'Neutral'

  const surpriseLabel = metrics.surprise_index > 0.6
    ? 'High surprise'
    : metrics.surprise_index > 0.3
      ? 'Moderate'
      : 'Predictable'

  // Influence ratio text
  const influenceRatio = metrics.influence_a_on_b > 0 && metrics.influence_b_on_a > 0
    ? (metrics.influence_a_on_b / metrics.influence_b_on_a).toFixed(1)
    : null

  return (
    <div className="neural-card relative">
      <HudBrackets />
      <div className="p-4 space-y-4">
        <h3 className="font-display text-sm uppercase tracking-wider text-text-primary">
          Collaboration Chemistry
        </h3>

        {/* Initiative Balance */}
        <div>
          <div className="text-xs text-text-dim mb-2 uppercase tracking-wide">
            Initiative Balance
          </div>
          <BarSplit
            left={metrics.initiative_a}
            right={metrics.initiative_b}
            leftColor={MODEL_A_COLOR}
            rightColor={MODEL_B_COLOR}
            leftLabel={agentAName}
            rightLabel={agentBName}
          />
        </div>

        {/* Influence Flow */}
        <div>
          <div className="text-xs text-text-dim mb-2 uppercase tracking-wide">
            Vocabulary Influence Flow
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: MODEL_A_COLOR }}>
                {(metrics.influence_a_on_b * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-text-dim">
                {agentAName} &rarr; {agentBName}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: MODEL_B_COLOR }}>
                {(metrics.influence_b_on_a * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-text-dim">
                {agentBName} &rarr; {agentAName}
              </div>
            </div>
          </div>
          {influenceRatio && (
            <div className="text-xs text-text-dim text-center mt-1">
              {agentAName} influenced {agentBName}&apos;s language {influenceRatio}x more
            </div>
          )}
        </div>

        {/* Convergence + Surprise */}
        <div className="grid grid-cols-2 gap-4">
          <MetricGauge
            value={metrics.convergence_rate}
            label="Convergence"
            description={convergenceLabel}
          />
          <MetricGauge
            value={metrics.surprise_index}
            label="Surprise Index"
            description={surpriseLabel}
          />
        </div>
      </div>
    </div>
  )
}

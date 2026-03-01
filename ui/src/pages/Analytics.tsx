import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord, ExperimentStats, RadarDataPoint, TurnScore, CollaborationMetrics } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VocabGrowthChart } from '@/components/analytics/VocabGrowthChart'
import { LatencyChart } from '@/components/analytics/LatencyChart'
import { TokenChart } from '@/components/analytics/TokenChart'
import { RadarChart } from '@/components/analytics/RadarChart'
import { RoundScoreChart } from '@/components/analytics/RoundScoreChart'
import { ChemistryCard } from '@/components/analytics/ChemistryCard'
import { formatDuration, modelDisplayName } from '@/lib/format'
import { HudBrackets } from '@/components/common/HudBrackets'
import { SpriteAvatar } from '@/components/theater/SpriteAvatar'
import { ProviderSigil } from '@/components/common/ProviderSigil'
import { resolveSpritePair } from '@/lib/spriteStatus'
import { downloadExperimentJson, downloadExperimentCsv, copyExperimentMarkdown } from '@/lib/exporters'

const MODEL_A_COLOR = '#F59E0B'
const MODEL_B_COLOR = '#06B6D4'

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'running'
      ? 'bg-success/20 text-success animate-pulse-slow'
      : status === 'completed'
        ? 'bg-accent/20 text-accent'
        : status === 'failed'
          ? 'bg-danger/20 text-danger'
          : 'bg-text-dim/20 text-text-dim'
  return <Badge variant="secondary" className={`text-xs ${styles}`}>{status}</Badge>
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="neural-card relative">
      <HudBrackets />
      <div className="p-4 text-center">
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-dim mt-1">{label}</div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null)
  const [stats, setStats] = useState<ExperimentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [radar, setRadar] = useState<RadarDataPoint[]>([])
  const [scores, setScores] = useState<TurnScore[]>([])
  const [chemistry, setChemistry] = useState<CollaborationMetrics | null>(null)
  const [exporting, setExporting] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [labelEditing, setLabelEditing] = useState(false)
  const [labelValue, setLabelValue] = useState('')
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    if (!experimentId) return
    try {
      const [exp, st, radarRes, scoresRes] = await Promise.all([
        api.getExperiment(experimentId),
        api.getExperimentStats(experimentId),
        api.getExperimentRadar(experimentId).catch(() => null),
        api.getExperimentScores(experimentId).catch(() => null),
      ])
      setExperiment(exp)
      setLabelValue(exp.label ?? '')
      setStats(st)
      if (scoresRes) setScores(scoresRes.scores)
      if (radarRes && radarRes.models && radarRes.models.length > 0) {
        setRadar(radarRes.models.map((m, i) => ({
          model: m.model,
          display_name: m.display_name,
          color: i === 0 ? MODEL_A_COLOR : MODEL_B_COLOR,
          axes: [
            { axis: 'Verbosity', value: m.verbosity },
            { axis: 'Speed', value: m.speed },
            { axis: 'Creativity', value: m.creativity },
            { axis: 'Consistency', value: m.consistency },
            { axis: 'Engagement', value: m.engagement },
          ],
        })))
      }
      api.getCollaborationChemistry(experimentId).then(setChemistry).catch(() => {})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  // Initial fetch
  useEffect(() => { fetchData() }, [fetchData])

  // Poll if running
  useEffect(() => {
    if (!experiment || experiment.status !== 'running') return
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [experiment, fetchData])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-text-dim animate-pulse-slow">Loading analytics...</span>
      </div>
    )
  }

  if (error || !experiment || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-danger">{error ?? 'Experiment not found'}</p>
        <Link to="/gallery" className="text-accent hover:underline text-sm">
          &larr; Back to Gallery
        </Link>
      </div>
    )
  }

  const modelA = modelDisplayName(experiment.model_a)
  const modelB = modelDisplayName(experiment.model_b)

  // Sprite outcome states from winner field
  const spriteStatuses = resolveSpritePair(experiment.winner, experiment.status)
  const spriteA = spriteStatuses.a
  const spriteB = spriteStatuses.b

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link to="/gallery" className="text-xs text-text-dim hover:text-accent">
          &#8592; Gallery
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3 flex-wrap">
              <SpriteAvatar status={spriteA} color="model-a" size={40} />
              <ProviderSigil model={experiment.model_a} size={14} color="rgba(245,158,11,0.75)" />
              <span className="text-model-a">{modelA}</span>
              <span className="text-text-dim font-normal"> vs </span>
              <SpriteAvatar status={spriteB} color="model-b" size={40} />
              <ProviderSigil model={experiment.model_b} size={14} color="rgba(6,182,212,0.75)" />
              <span className="text-model-b">{modelB}</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={experiment.status} />
              <span className="text-sm text-text-dim">
                {experiment.rounds_completed}/{experiment.rounds_planned} rounds
              </span>
              {experiment.elapsed_seconds != null && (
                <span className="text-sm text-text-dim">
                  {formatDuration(experiment.elapsed_seconds)}
                </span>
              )}
              {experiment.preset && (
                <Badge variant="secondary" className="text-xs">{experiment.preset}</Badge>
              )}
            </div>
            {/* Inline nickname editor */}
            {labelEditing ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  className="font-mono text-xs bg-bg-deep border border-accent/30 rounded-sm px-2 py-0.5 text-text-primary focus:outline-none focus:border-accent/60 w-52"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      api.setExperimentLabel(experimentId!, labelValue.trim() || null)
                        .then(() => { setExperiment((ex) => ex ? { ...ex, label: labelValue.trim() || null } : ex); setLabelEditing(false) })
                        .catch(console.error)
                    }
                    if (e.key === 'Escape') setLabelEditing(false)
                  }}
                  placeholder="add nickname..."
                  autoFocus
                />
                <button
                  className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase"
                  onClick={() => {
                    api.setExperimentLabel(experimentId!, labelValue.trim() || null)
                      .then(() => { setExperiment((ex) => ex ? { ...ex, label: labelValue.trim() || null } : ex); setLabelEditing(false) })
                      .catch(console.error)
                  }}
                >save</button>
                <button
                  className="font-mono text-[9px] text-text-dim/40 hover:text-text-dim tracking-wider uppercase"
                  onClick={() => setLabelEditing(false)}
                >cancel</button>
              </div>
            ) : (
              <button
                className="font-mono text-[10px] text-text-dim/50 hover:text-accent/70 tracking-wider mt-1.5 block text-left transition-colors"
                onClick={() => setLabelEditing(true)}
              >
                {experiment.label ? `// ${experiment.label}` : '// add nickname...'}
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {experiment.parent_experiment_id && (
              <Button
                variant="outline"
                size="sm"
                className="border-violet-500/40 text-violet-300/80 hover:text-violet-200"
                onClick={() => navigate(`/tree/${experiment.parent_experiment_id}`)}
              >
                View Tree
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-border-custom text-violet-400 hover:text-violet-300"
              onClick={() => navigate(`/documentary/${experimentId}`)}
            >
              View Documentary
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border-custom text-text-dim"
              onClick={() => experimentId && downloadExperimentJson(experimentId, () => setExporting(true), () => setExporting(false))}
              disabled={exporting}
            >
              {exporting ? '...' : 'Download JSON'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border-custom text-text-dim"
              onClick={() => experimentId && downloadExperimentCsv(experimentId, () => setExporting(true), () => setExporting(false))}
              disabled={exporting}
            >
              {exporting ? '...' : 'Download CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border-custom ${copyStatus === 'success' ? 'text-green-400' : copyStatus === 'error' ? 'text-red-400' : 'text-text-dim'}`}
              onClick={async () => {
                if (!experimentId) return
                const result = await copyExperimentMarkdown(experimentId, () => setExporting(true), () => setExporting(false))
                setCopyStatus(result)
                setTimeout(() => setCopyStatus('idle'), 2000)
              }}
              disabled={exporting}
            >
              {exporting
                ? '...'
                : copyStatus === 'success'
                  ? 'Copied!'
                  : copyStatus === 'error'
                    ? 'Failed \u2014 try again'
                    : 'Copy Markdown'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Turns" value={String(stats.totals.total_turns)} />
        <StatCard label="Tokens" value={stats.totals.total_tokens.toLocaleString()} />
        <StatCard
          label={`Avg Latency (${modelA})`}
          value={stats.totals.avg_latency_a != null ? `${stats.totals.avg_latency_a}s` : '\u2014'}
        />
        <StatCard
          label={`Avg Latency (${modelB})`}
          value={stats.totals.avg_latency_b != null ? `${stats.totals.avg_latency_b}s` : '\u2014'}
        />
        <StatCard label="Words Coined" value={String(stats.totals.vocab_count)} />
        {experiment.temperature_a != null && (
          <StatCard label={`Temp (${modelA})`} value={experiment.temperature_a.toFixed(1)} />
        )}
        {experiment.temperature_b != null && (
          <StatCard label={`Temp (${modelB})`} value={experiment.temperature_b.toFixed(1)} />
        )}
        {experiment.judge_model && (
          <StatCard label="Referee" value={experiment.judge_model.split('/').pop() ?? experiment.judge_model} />
        )}
      </div>

      {/* Collaboration Chemistry Card */}
      {chemistry && experiment && (
        <div className="mb-6">
          <ChemistryCard
            metrics={chemistry}
            agentAName={modelDisplayName(experiment.model_a)}
            agentBName={modelDisplayName(experiment.model_b)}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neural-card">
          <div className="p-5">
            <h2 className="font-display text-xs font-bold tracking-wider uppercase text-text-primary mb-4">Vocabulary Growth</h2>
            <VocabGrowthChart data={stats.vocab_by_round} />
          </div>
        </div>

        <div className="neural-card">
          <div className="p-5">
            <h2 className="font-display text-xs font-bold tracking-wider uppercase text-text-primary mb-4">Latency per Round</h2>
            <LatencyChart
              data={stats.turns_by_round}
              modelAName={modelA}
              modelBName={modelB}
            />
          </div>
        </div>
      </div>

      {/* Second chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neural-card">
          <div className="p-5">
            <h2 className="font-display text-xs font-bold tracking-wider uppercase text-text-primary mb-4">Tokens per Round</h2>
            <TokenChart
              data={stats.turns_by_round}
              modelAName={modelA}
              modelBName={modelB}
            />
          </div>
        </div>

        {radar.length > 0 && (
          <div className="neural-card">
            <div className="p-5">
              <h2 className="font-display text-xs font-bold tracking-wider uppercase text-text-primary mb-4">Model Personality</h2>
              <RadarChart data={radar} height={280} />
            </div>
          </div>
        )}
      </div>

      {experiment.enable_scoring && (
        <div className="neural-card">
          <div className="p-5">
            <h2 className="font-display text-xs font-bold tracking-wider uppercase text-text-primary mb-4">Turn Scores</h2>
            <RoundScoreChart scores={scores} />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3">
        <Link to={`/theater/${experiment.id}`}>
          <Button variant="outline" size="sm" className="border-border-custom text-text-dim">
            View in Theater
          </Button>
        </Link>
        <Link to={`/dictionary/${experiment.id}`}>
          <Button variant="outline" size="sm" className="border-border-custom text-text-dim">
            View Dictionary
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="border-border-custom text-text-dim"
          onClick={() => navigate(`/configure/${experiment.preset ?? 'custom'}?remix=${experiment.id}`)}
        >
          Remix
        </Button>
      </div>
    </div>
  )
}

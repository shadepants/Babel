import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord, ExperimentStats, RadarDataPoint, VocabWord, TurnRecord, TurnScore } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VocabGrowthChart } from '@/components/analytics/VocabGrowthChart'
import { LatencyChart } from '@/components/analytics/LatencyChart'
import { TokenChart } from '@/components/analytics/TokenChart'
import { RadarChart } from '@/components/analytics/RadarChart'
import { RoundScoreChart } from '@/components/analytics/RoundScoreChart'
import { formatDuration } from '@/lib/format'
import { HudBrackets } from '@/components/common/HudBrackets'
import { SpriteAvatar } from '@/components/theater/SpriteAvatar'
import type { SpriteStatus } from '@/components/theater/SpriteAvatar'

const MODEL_A_COLOR = '#F59E0B'
const MODEL_B_COLOR = '#06B6D4'

/** Extract short name from litellm model string */
function modelDisplayName(model: string): string {
  const after = model.split('/').pop() ?? model
  return after.replace(/-\d{8}$/, '')
}

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
      if (radarRes && radarRes.models.length > 0) {
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

  // ── Export: Download JSON ──
  async function handleDownloadJson() {
    if (!experimentId || exporting) return
    setExporting(true)
    try {
      const [exp, turns, vocab] = await Promise.all([
        api.getExperiment(experimentId),
        api.getExperimentTurns(experimentId),
        api.getVocabulary(experimentId),
      ])
      const blob = new Blob(
        [JSON.stringify({ experiment: exp, turns: turns.turns, vocabulary: vocab.words }, null, 2)],
        { type: 'application/json' },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `babel-${experimentId}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — user can retry
    } finally {
      setExporting(false)
    }
  }

  // ── Export: Download CSV ──
  async function handleDownloadCsv() {
    if (!experimentId || exporting) return
    setExporting(true)
    try {
      const turnsRes = await api.getExperimentTurns(experimentId)
      const rows = [
        ['round', 'speaker', 'model', 'content', 'latency_seconds', 'token_count'],
        ...(turnsRes.turns as TurnRecord[]).map((t) => [
          String(t.round),
          t.speaker,
          t.model,
          `"${t.content.replace(/"/g, '""')}"`,
          t.latency_seconds != null ? String(t.latency_seconds) : '',
          t.token_count != null ? String(t.token_count) : '',
        ]),
      ]
      const csv = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `babel-${experimentId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — user can retry
    } finally {
      setExporting(false)
    }
  }

  // ── Export: Copy Markdown ──
  async function handleCopyMarkdown() {
    if (!experimentId || exporting) return
    setExporting(true)
    try {
      const [exp, turnsRes, vocabRes] = await Promise.all([
        api.getExperiment(experimentId),
        api.getExperimentTurns(experimentId),
        api.getVocabulary(experimentId),
      ])
      const lines = [
        `# Babel Experiment: ${modelDisplayName(exp.model_a)} vs ${modelDisplayName(exp.model_b)}`,
        '',
        `**Status:** ${exp.status} | **Rounds:** ${exp.rounds_completed}/${exp.rounds_planned} | **Elapsed:** ${exp.elapsed_seconds ? formatDuration(exp.elapsed_seconds) : '—'}`,
        '',
        '## Conversation',
        '',
      ]
      let currentRound = 0
      for (const turn of turnsRes.turns as TurnRecord[]) {
        if (turn.round !== currentRound) {
          currentRound = turn.round
          lines.push(`### Round ${currentRound}`, '')
        }
        lines.push(`**${turn.speaker}** (${turn.latency_seconds?.toFixed(1) ?? '?'}s):`, '', turn.content, '')
      }
      if (vocabRes.words.length > 0) {
        lines.push('## Vocabulary', '')
        for (const w of vocabRes.words as VocabWord[]) {
          lines.push(`- **${w.word}**${w.meaning ? `: ${w.meaning}` : ''} _(coined by ${w.coined_by}, round ${w.coined_round})_`)
        }
      }

      const text = lines.join('\n')
      let copied = false

      // Try modern Clipboard API first
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text)
          copied = true
        } catch {
          // fall through to execCommand fallback
        }
      }

      // Fallback: create a temporary textarea and use execCommand
      if (!copied) {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      }

      setCopyStatus(copied ? 'success' : 'error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } finally {
      setExporting(false)
    }
  }

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
          ← Back to Gallery
        </Link>
      </div>
    )
  }

  const modelA = modelDisplayName(experiment.model_a)
  const modelB = modelDisplayName(experiment.model_b)

  // Sprite outcome states from winner field
  const spriteA: SpriteStatus = experiment.winner === 'model_a' ? 'winner'
    : experiment.winner === 'model_b' ? 'loser'
    : experiment.status === 'failed' ? 'error'
    : 'idle'
  const spriteB: SpriteStatus = experiment.winner === 'model_b' ? 'winner'
    : experiment.winner === 'model_a' ? 'loser'
    : experiment.status === 'failed' ? 'error'
    : 'idle'

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
              <span className="text-model-a">{modelA}</span>
              <span className="text-text-dim font-normal"> vs </span>
              <SpriteAvatar status={spriteB} color="model-b" size={40} />
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
              onClick={handleDownloadJson}
              disabled={exporting}
            >
              {exporting ? '...' : 'Download JSON'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border-custom text-text-dim"
              onClick={handleDownloadCsv}
              disabled={exporting}
            >
              {exporting ? '...' : 'Download CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border-custom ${copyStatus === 'success' ? 'text-green-400' : copyStatus === 'error' ? 'text-red-400' : 'text-text-dim'}`}
              onClick={handleCopyMarkdown}
              disabled={exporting}
            >
              {exporting
                ? '...'
                : copyStatus === 'success'
                  ? 'Copied!'
                  : copyStatus === 'error'
                    ? 'Failed — try again'
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
          value={stats.totals.avg_latency_a != null ? `${stats.totals.avg_latency_a}s` : '—'}
        />
        <StatCard
          label={`Avg Latency (${modelB})`}
          value={stats.totals.avg_latency_b != null ? `${stats.totals.avg_latency_b}s` : '—'}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neural-card">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Vocabulary Growth</h2>
            <VocabGrowthChart data={stats.vocab_by_round} />
          </div>
        </div>

        <div className="neural-card">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Latency per Round</h2>
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
            <h2 className="text-sm font-semibold text-text-primary mb-4">Tokens per Round</h2>
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
              <h2 className="text-sm font-semibold text-text-primary mb-4">Model Personality</h2>
              <RadarChart data={radar} height={280} />
            </div>
          </div>
        )}
      </div>

      {experiment.enable_scoring && (
        <div className="neural-card">
          <div className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Turn Scores</h2>
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

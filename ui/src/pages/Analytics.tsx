import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord, ExperimentStats, VocabWord, TurnRecord } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VocabGrowthChart } from '@/components/analytics/VocabGrowthChart'
import { LatencyChart } from '@/components/analytics/LatencyChart'

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
    <Card className="bg-bg-card border-border-custom">
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-dim mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}

export default function Analytics() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null)
  const [stats, setStats] = useState<ExperimentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const fetchData = useCallback(async () => {
    if (!experimentId) return
    try {
      const [exp, st] = await Promise.all([
        api.getExperiment(experimentId),
        api.getExperimentStats(experimentId),
      ])
      setExperiment(exp)
      setStats(st)
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
        `**Status:** ${exp.status} | **Rounds:** ${exp.rounds_completed}/${exp.rounds_planned} | **Elapsed:** ${exp.elapsed_seconds ? `${exp.elapsed_seconds}s` : '—'}`,
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

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link to="/gallery" className="text-xs text-text-dim hover:text-accent">
          ← Gallery
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              <span className="text-model-a">{modelA}</span>
              <span className="text-text-dim font-normal"> vs </span>
              <span className="text-model-b">{modelB}</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={experiment.status} />
              <span className="text-sm text-text-dim">
                {experiment.rounds_completed}/{experiment.rounds_planned} rounds
              </span>
              {experiment.elapsed_seconds && (
                <span className="text-sm text-text-dim">
                  {experiment.elapsed_seconds}s
                </span>
              )}
              {experiment.preset && (
                <Badge variant="secondary" className="text-xs">{experiment.preset}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-bg-card border-border-custom">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Vocabulary Growth</h2>
            <VocabGrowthChart data={stats.vocab_by_round} />
          </CardContent>
        </Card>

        <Card className="bg-bg-card border-border-custom">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Latency per Round</h2>
            <LatencyChart
              data={stats.turns_by_round}
              modelAName={modelA}
              modelBName={modelB}
            />
          </CardContent>
        </Card>
      </div>

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
      </div>
    </div>
  )
}

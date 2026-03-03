import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ComparisonData, ComparisonExperiment } from '@/api/types'
import { modelDisplayName } from '@/lib/format'
import { Button } from '@/components/ui/button'

// ── helpers ──────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  model_a: 'Model A',
  model_b: 'Model B',
  temperature_a: 'Temperature A',
  temperature_b: 'Temperature B',
  rounds: 'Rounds',
  system_prompt: 'System Prompt',
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-success animate-pulse-slow',
    completed: 'bg-accent',
    stopped: 'bg-text-dim',
    failed: 'bg-danger',
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${colors[status] ?? 'bg-text-dim'}`} />
  )
}

function WinnerBadge({ winner }: { winner: string | null | undefined }) {
  if (!winner) return <span className="text-text-dim/50 text-xs">no verdict</span>
  if (winner === 'tie') return <span className="text-text-dim/70 text-xs font-mono">tie</span>
  if (winner === 'agent_0') return <span className="text-amber-400 text-xs font-mono font-bold">A wins</span>
  if (winner === 'agent_1') return <span className="text-cyan-400 text-xs font-mono font-bold">B wins</span>
  return <span className="text-text-dim/70 text-xs font-mono">{winner}</span>
}

// ── experiment card ───────────────────────────────────────────────────────────

function ExperimentCard({
  exp,
  label,
  accentClass,
  experimentId,
}: {
  exp: ComparisonExperiment
  label: 'A' | 'B'
  accentClass: string
  experimentId: string
}) {
  const aName = modelDisplayName(exp.model_a)
  const bName = modelDisplayName(exp.model_b)

  return (
    <div className={`bg-bg-card/60 border rounded-lg overflow-hidden ${accentClass}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-custom/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`font-display text-xs tracking-[0.2em] font-bold ${label === 'A' ? 'text-amber-400' : 'text-cyan-400'}`}>
            VARIANT {label}
          </span>
          <span className="font-mono text-[10px] text-text-dim/50">{label === 'A' ? 'control' : 'fork'}</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusDot status={exp.status} />
          <span className="font-mono text-[10px] text-text-dim">{exp.status}</span>
        </div>
      </div>

      {/* Models */}
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-wider uppercase text-text-dim/40 w-6">A</span>
          <span className="font-mono text-xs text-text-primary">{aName}</span>
          {exp.temperature_a !== undefined && (
            <span className="font-mono text-[10px] text-text-dim/50">t={exp.temperature_a?.toFixed(1)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-wider uppercase text-text-dim/40 w-6">B</span>
          <span className="font-mono text-xs text-text-primary">{bName}</span>
          {exp.temperature_b !== undefined && (
            <span className="font-mono text-[10px] text-text-dim/50">t={exp.temperature_b?.toFixed(1)}</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-t border-border-custom/30">
        <div className="text-center">
          <div className="font-mono text-lg font-bold text-text-primary">{exp.vocab_count}</div>
          <div className="font-mono text-[9px] text-text-dim/50 uppercase tracking-wide">vocab</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-text-primary">
            {exp.avg_score !== null ? exp.avg_score.toFixed(1) : <span className="text-text-dim/40 text-xs">&mdash;</span>}
          </div>
          <div className="font-mono text-[9px] text-text-dim/50 uppercase tracking-wide">avg score</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold">
            <WinnerBadge winner={exp.winner} />
          </div>
          <div className="font-mono text-[9px] text-text-dim/50 uppercase tracking-wide">winner</div>
        </div>
      </div>

      {/* Rounds */}
      <div className="px-4 py-2 border-t border-border-custom/30">
        <span className="font-mono text-[10px] text-text-dim/50">
          {exp.rounds_completed}/{exp.rounds_planned} rounds
        </span>
      </div>

      {/* Links */}
      <div className="px-4 py-3 border-t border-border-custom/30 flex gap-2 flex-wrap">
        <Link to={`/theater/${exp.id}`}>
          <Button variant="outline" size="sm" className="font-mono text-[10px] h-6 px-2">Theater</Button>
        </Link>
        <Link to={`/analytics/${exp.id}`}>
          <Button variant="outline" size="sm" className="font-mono text-[10px] h-6 px-2">Analytics</Button>
        </Link>
        <Link to={`/dictionary/${exp.id}`}>
          <Button variant="outline" size="sm" className="font-mono text-[10px] h-6 px-2">Dictionary</Button>
        </Link>
      </div>
    </div>
  )
}

// ── vocab diff table ──────────────────────────────────────────────────────────

function VocabDiffTable({
  aOnly,
  bOnly,
  shared,
}: {
  aOnly: string[]
  bOnly: string[]
  shared: string[]
}) {
  if (aOnly.length === 0 && bOnly.length === 0 && shared.length === 0) {
    return (
      <p className="font-mono text-xs text-text-dim/50 italic">No vocabulary data yet.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-amber-400/70 mb-2">
          A only ({aOnly.length})
        </div>
        {aOnly.length === 0
          ? <p className="font-mono text-[10px] text-text-dim/40">none</p>
          : (
            <ul className="space-y-0.5">
              {aOnly.map(w => (
                <li key={w} className="font-mono text-xs text-amber-300/80">{w}</li>
              ))}
            </ul>
          )}
      </div>
      <div>
        <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-cyan-400/70 mb-2">
          B only ({bOnly.length})
        </div>
        {bOnly.length === 0
          ? <p className="font-mono text-[10px] text-text-dim/40">none</p>
          : (
            <ul className="space-y-0.5">
              {bOnly.map(w => (
                <li key={w} className="font-mono text-xs text-cyan-300/80">{w}</li>
              ))}
            </ul>
          )}
      </div>
      <div>
        <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-dim/50 mb-2">
          Shared ({shared.length})
        </div>
        {shared.length === 0
          ? <p className="font-mono text-[10px] text-text-dim/40">none</p>
          : (
            <ul className="space-y-0.5">
              {shared.map(w => (
                <li key={w} className="font-mono text-xs text-text-dim/70">{w}</li>
              ))}
            </ul>
          )}
      </div>
    </div>
  )
}

// ── diff metrics bar ──────────────────────────────────────────────────────────

function MetricDiffBar({
  labelA, labelB, valA, valB, winner,
}: {
  labelA: string
  labelB: string
  valA: number | null
  valB: number | null
  winner?: 'A' | 'B' | 'tie' | null
}) {
  const bothKnown = valA !== null && valB !== null
  const delta = bothKnown ? valB - valA : null

  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      <span className="text-amber-400 w-16 text-right">{valA !== null ? valA : '—'}</span>
      <div className="flex-1 relative h-1.5 bg-border-custom/30 rounded-full overflow-hidden">
        {bothKnown && valA !== null && valB !== null && (valA + valB) > 0 && (
          <>
            <div
              className="absolute left-0 h-full bg-amber-400/70 rounded-l-full"
              style={{ width: `${(valA / (valA + valB)) * 100}%` }}
            />
            <div
              className="absolute right-0 h-full bg-cyan-400/70 rounded-r-full"
              style={{ width: `${(valB / (valA + valB)) * 100}%` }}
            />
          </>
        )}
      </div>
      <span className="text-cyan-400 w-16">{valB !== null ? valB : '—'}</span>
      {delta !== null && (
        <span className={`w-14 text-right ${delta > 0 ? 'text-cyan-400' : delta < 0 ? 'text-amber-400' : 'text-text-dim/50'}`}>
          {delta > 0 ? '+' : ''}{delta > 0 || delta < 0 ? delta.toFixed(1) : '='}
        </span>
      )}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Compare() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchData(id: string) {
    try {
      const result = await api.getComparison(id)
      setData(result)
      setError(null)
      // Stop polling once both experiments are done
      const allDone = result.experiments.every(
        e => e.status === 'completed' || e.status === 'stopped' || e.status === 'failed'
      )
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!experimentId) return
    fetchData(experimentId)

    // Poll every 8s while fork may still be running
    pollRef.current = setInterval(() => fetchData(experimentId), 8_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [experimentId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-mono text-xs text-text-dim animate-pulse tracking-widest">loading&hellip;</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="font-mono text-sm text-danger">{error ?? 'Comparison not found'}</p>
        <Link to="/gallery" className="font-mono text-xs text-accent hover:underline">Back to Gallery</Link>
      </div>
    )
  }

  const [expA, expB] = data.experiments
  const forkRunning = expB.status === 'running'

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border-custom">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/40 mb-1">
              // a_b_comparison
            </div>
            <h1 className="font-display text-xl text-text-primary tracking-wider">
              A/B Comparison
            </h1>
            {data.changed_field && (
              <p className="font-mono text-[11px] text-violet-400 mt-1">
                Variable changed: <span className="font-bold">{FIELD_LABELS[data.changed_field] ?? data.changed_field}</span>
                {' '}
                <span className="text-text-dim/60">
                  ({data.changed_from} &rarr; {data.changed_to})
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {forkRunning && (
              <span className="font-mono text-[10px] text-success/80 animate-pulse-slow">
                fork running&hellip;
              </span>
            )}
            <Link to="/gallery">
              <Button variant="outline" className="font-mono text-xs">Gallery</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-8 max-w-5xl mx-auto w-full">

        {/* Side-by-side experiment cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExperimentCard
            exp={expA}
            label="A"
            accentClass="border-amber-500/30"
            experimentId={expA.id}
          />
          <ExperimentCard
            exp={expB}
            label="B"
            accentClass="border-cyan-500/30"
            experimentId={expB.id}
          />
        </div>

        {/* Diff metrics bar */}
        <div className="bg-bg-card/40 border border-border-custom rounded-lg px-5 py-4 space-y-3">
          <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-text-dim/40 mb-3">
            // metric_diff &mdash;
            <span className="text-amber-400/70 ml-2">A</span>
            <span className="text-text-dim/40 mx-2">vs</span>
            <span className="text-cyan-400/70">B</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 font-mono text-[9px] tracking-wider uppercase text-text-dim/40">
              <span className="w-16 text-right">A</span>
              <div className="flex-1 text-center">metric</div>
              <span className="w-16">B</span>
              <span className="w-14 text-right">&Delta;</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 font-mono text-[10px] text-text-dim/60">
                <span className="w-16 text-right text-amber-400">{expA.vocab_count}</span>
                <div className="flex-1 text-center tracking-wide uppercase text-[9px]">vocab</div>
                <span className="w-16 text-cyan-400">{expB.vocab_count}</span>
                <span className={`w-14 text-right font-bold ${expB.vocab_count > expA.vocab_count ? 'text-cyan-400' : expB.vocab_count < expA.vocab_count ? 'text-amber-400' : 'text-text-dim/40'}`}>
                  {expB.vocab_count > expA.vocab_count ? '+' : ''}{expB.vocab_count - expA.vocab_count}
                </span>
              </div>

              {(expA.avg_score !== null || expB.avg_score !== null) && (
                <div className="flex items-center gap-3 font-mono text-[10px] text-text-dim/60">
                  <span className="w-16 text-right text-amber-400">{expA.avg_score?.toFixed(1) ?? '&mdash;'}</span>
                  <div className="flex-1 text-center tracking-wide uppercase text-[9px]">avg score</div>
                  <span className="w-16 text-cyan-400">{expB.avg_score?.toFixed(1) ?? '&mdash;'}</span>
                  <span className={`w-14 text-right font-bold ${
                    expA.avg_score !== null && expB.avg_score !== null
                      ? expB.avg_score > expA.avg_score ? 'text-cyan-400'
                        : expB.avg_score < expA.avg_score ? 'text-amber-400'
                        : 'text-text-dim/40'
                      : 'text-text-dim/40'
                  }`}>
                    {expA.avg_score !== null && expB.avg_score !== null
                      ? `${expB.avg_score - expA.avg_score > 0 ? '+' : ''}${(expB.avg_score - expA.avg_score).toFixed(1)}`
                      : '&mdash;'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 font-mono text-[10px] text-text-dim/60">
                <span className="w-16 text-right">
                  <WinnerBadge winner={expA.winner} />
                </span>
                <div className="flex-1 text-center tracking-wide uppercase text-[9px]">winner</div>
                <span className="w-16">
                  <WinnerBadge winner={expB.winner} />
                </span>
                <span className="w-14" />
              </div>
            </div>
          </div>
        </div>

        {/* Vocabulary diff */}
        <div className="bg-bg-card/40 border border-border-custom rounded-lg px-5 py-4 space-y-3">
          <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-text-dim/40">
            // vocabulary_diff
          </div>
          <VocabDiffTable
            aOnly={data.vocab_diff.a_only}
            bOnly={data.vocab_diff.b_only}
            shared={data.vocab_diff.shared}
          />
        </div>

      </div>
    </div>
  )
}

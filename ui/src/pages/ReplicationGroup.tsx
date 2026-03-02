import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ReplicationGroup, ReplicationStats } from '@/api/types'
import { ScrambleText } from '@/components/common/ScrambleText'

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined) return '--'
  return n.toFixed(decimals)
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'completed' ? 'text-emerald-400 border-emerald-500/30' :
    status === 'running'   ? 'text-accent border-accent/30 animate-pulse' :
    status === 'partial'   ? 'text-amber-400 border-amber-500/30' :
    'text-danger border-danger/30'
  return (
    <span className={`font-mono text-[9px] tracking-widest uppercase border px-1.5 py-0.5 rounded-sm ${cls}`}>
      {status}
    </span>
  )
}

function StatsPanel({ stats, count }: { stats: ReplicationStats; count: number }) {
  const n = count - (stats.failed ?? 0)
  const vc = stats.vocab_count
  const w = stats.winner

  return (
    <div className="neural-card">
      <div className="neural-card-bar" />
      <div className="p-4 space-y-4">
        <div className="neural-section-label">// aggregate_stats <span className="text-text-dim/40">n={n} completed</span></div>

        {/* Vocab count */}
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">
            <span>Vocab coined</span>
            <span className="text-text-primary">
              {fmt(vc.mean)} &plusmn; {fmt(vc.stddev ?? null)}
              {vc.min !== null && <span className="text-text-dim/40 ml-2">({vc.min}&ndash;{vc.max})</span>}
            </span>
          </div>
          {vc.values.length > 0 && (
            <div className="flex gap-1 items-end h-8">
              {vc.values.map((v, i) => {
                const maxV = Math.max(...vc.values, 1)
                const h = Math.max(4, Math.round((v / maxV) * 32))
                return (
                  <div
                    key={i}
                    title={`Run ${i + 1}: ${v} words`}
                    style={{ height: h }}
                    className="flex-1 bg-accent/40 rounded-sm"
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Winner breakdown */}
        <div className="space-y-1">
          <div className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">Winner</div>
          <div className="flex gap-1 h-3 rounded overflow-hidden">
            {w.A > 0    && <div style={{ flex: w.A }}    className="bg-model-a/70" title={`A wins: ${w.A}`} />}
            {w.B > 0    && <div style={{ flex: w.B }}    className="bg-model-b/70" title={`B wins: ${w.B}`} />}
            {w.tie > 0  && <div style={{ flex: w.tie }}  className="bg-accent/50"  title={`Ties: ${w.tie}`} />}
            {w.none > 0 && <div style={{ flex: w.none }} className="bg-border-custom" title={`No verdict: ${w.none}`} />}
          </div>
          <div className="flex gap-3 font-mono text-[9px] text-text-dim/50">
            {w.A > 0    && <span><span className="text-model-a">A</span> {w.A}</span>}
            {w.B > 0    && <span><span className="text-model-b">B</span> {w.B}</span>}
            {w.tie > 0  && <span><span className="text-accent">tie</span> {w.tie}</span>}
            {w.none > 0 && <span>no verdict {w.none}</span>}
          </div>
        </div>

        {/* Avg scores */}
        {(stats.avg_score_a.mean !== null || stats.avg_score_b.mean !== null) && (
          <div className="space-y-1">
            <div className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase">Avg score</div>
            <div className="flex gap-4 font-mono text-xs">
              <span><span className="text-model-a">A</span> {fmt(stats.avg_score_a.mean)}</span>
              <span><span className="text-model-b">B</span> {fmt(stats.avg_score_b.mean)}</span>
            </div>
          </div>
        )}

        {stats.failed > 0 && (
          <p className="font-mono text-[9px] text-danger/70 tracking-wider">
            // {stats.failed} experiment{stats.failed > 1 ? 's' : ''} failed &mdash; excluded from stats
          </p>
        )}
      </div>
    </div>
  )
}

export default function ReplicationGroupPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const [group, setGroup] = useState<ReplicationGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    if (!groupId) return
    api.getReplicationGroup(groupId)
      .then(setGroup)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { fetch() }, [fetch])

  // Auto-poll while running
  useEffect(() => {
    if (!group || group.status !== 'running') return
    const id = setInterval(fetch, 10_000)
    return () => clearInterval(id)
  }, [group, fetch])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">loading...</p>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-mono text-xs text-danger">{error ?? 'Group not found'}</p>
          <Link to="/gallery" className="font-mono text-[10px] text-accent hover:text-accent/80 tracking-widest uppercase">
            &larr; Gallery
          </Link>
        </div>
      </div>
    )
  }

  const cfg = group.config_snapshot as Record<string, unknown>
  const preset = cfg.preset as string | null
  const modelA = cfg.model_a as string | null
  const modelB = cfg.model_b as string | null
  const rounds = cfg.rounds as number | null

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <Link to="/gallery" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
          &larr; Gallery
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
            <ScrambleText>Replication Group</ScrambleText>
          </h1>
          <span className="font-mono text-[10px] text-accent/60 border border-accent/20 px-1.5 py-0.5 rounded-sm">
            n={group.count}
          </span>
          <StatusBadge status={group.status} />
        </div>
        <p className="font-mono text-[9px] text-text-dim/50 tracking-wider">
          // {group.group_id}
          {preset && <span className="ml-2 text-accent/50">&middot; {preset}</span>}
          {modelA && <span className="ml-2">&middot; {modelA.split('/').pop()} vs {modelB?.split('/').pop()}</span>}
          {rounds && <span className="ml-2">&middot; {rounds} rounds</span>}
        </p>
      </div>

      {/* Progress summary */}
      <div className="flex gap-4 font-mono text-[10px] text-text-dim/60 tracking-wider">
        <span><span className="text-emerald-400">{group.completed}</span> completed</span>
        {group.running > 0 && <span><span className="text-accent animate-pulse">{group.running}</span> running</span>}
        {group.failed > 0 && <span><span className="text-danger">{group.failed}</span> failed</span>}
      </div>

      {/* Stats panel */}
      <StatsPanel stats={group.stats} count={group.count} />

      {/* Experiment table */}
      <div className="neural-card">
        <div className="neural-card-bar" />
        <div className="p-4 space-y-2">
          <div className="neural-section-label">// individual_runs</div>
          <div className="divide-y divide-border-custom/30">
            {group.experiments.map((exp, i) => (
              <div key={exp.id} className="flex items-center justify-between py-2 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[9px] text-text-dim/40 w-5 shrink-0">#{i + 1}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    exp.status === 'completed' ? 'bg-emerald-400' :
                    exp.status === 'running'   ? 'bg-accent animate-pulse' :
                    exp.status === 'failed'    ? 'bg-danger' :
                    'bg-text-dim/30'
                  }`} />
                  <span className="font-mono text-[10px] text-text-dim/70 truncate">{exp.id}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {exp.winner && (
                    <span className={`font-mono text-[9px] tracking-wider ${
                      exp.winner === 'agent_0' ? 'text-model-a' :
                      exp.winner === 'agent_1' ? 'text-model-b' :
                      'text-text-dim/50'
                    }`}>
                      {exp.winner === 'agent_0' ? 'A wins' : exp.winner === 'agent_1' ? 'B wins' : exp.winner}
                    </span>
                  )}
                  <span className="font-mono text-[9px] text-text-dim/40">
                    {exp.rounds_completed}r
                  </span>
                  {exp.status === 'completed' || exp.status === 'running' ? (
                    <Link
                      to={`/theater/${exp.id}`}
                      className="font-mono text-[9px] text-accent hover:text-accent/80 tracking-wider"
                    >
                      View &rarr;
                    </Link>
                  ) : (
                    <span className="font-mono text-[9px] text-danger/60">{exp.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

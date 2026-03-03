import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord, ReplicationGroupSummary } from '@/api/types'
import { ScrambleText } from '@/components/common/ScrambleText'
import { formatDuration, modelDisplayName } from '@/lib/format'
import { formatModelVersion } from '@/lib/models'
import { SpriteAvatar } from '@/components/theater/SpriteAvatar'
import { getPresetGlow } from '@/lib/presetColors'
import { ProviderSigil } from '@/components/common/ProviderSigil'
import { resolveSpritePair } from '@/lib/spriteStatus'

/** Format ISO date string to compact form */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function rowStatusClass(status: string) {
  if (status === 'running') return 'neural-row neural-row--running'
  if (status === 'completed') return 'neural-row neural-row--completed'
  if (status === 'failed') return 'neural-row neural-row--failed'
  return 'neural-row neural-row--pending'
}

function dotStatusClass(status: string) {
  if (status === 'running') return 'status-dot status-dot--running'
  if (status === 'completed') return 'status-dot status-dot--completed'
  if (status === 'failed') return 'status-dot status-dot--failed'
  return 'status-dot status-dot--pending'
}

/** Build an inline style with a colored left border for preset rows */
function presetBorderStyle(preset: string | null | undefined): { borderLeft: string } | undefined {
  const glow = getPresetGlow(preset)
  if (!glow) return undefined
  // Boost alpha from ~0.30 to 0.65 so it reads as a border, not just a tint
  return { borderLeft: '3px solid ' + glow.replace(/,\s*[\d.]+\)$/, ', 0.65)') }
}

const PAGE_SIZE = 20
const STATUS_FILTERS = ['all', 'running', 'completed', 'failed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export default function Gallery() {
  const navigate = useNavigate()
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([])
  const [replicationGroups, setReplicationGroups] = useState<ReplicationGroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(false)  // Spec 018: baseline experiments hidden by default

  const fetchExperiments = useCallback(() => {
    setLoading(true)
    const params: { limit: number; offset: number; status?: string } = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }
    if (statusFilter !== 'all') params.status = statusFilter
    Promise.all([
      api.listExperiments(params),
      api.listReplicationGroups({ limit: 20 }),
    ])
      .then(([expRes, groupRes]) => {
        setExperiments(expRes.experiments)
        setReplicationGroups(groupRes.groups)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load experiments'))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

  // Auto-poll if there are running experiments or groups
  useEffect(() => {
    const hasRunning = experiments.some((e) => e.status === 'running')
      || replicationGroups.some((g) => g.status === 'running')
    if (!hasRunning) return
    const interval = setInterval(fetchExperiments, 15_000)
    return () => clearInterval(interval)
  }, [experiments, replicationGroups, fetchExperiments])

  // Experiments that don't belong to a replication group -- memoised to skip filter on unrelated re-renders
  const standaloneExperiments = useMemo(
    () => experiments.filter((e) => !e.replication_group_id),
    [experiments],
  )

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
              <ScrambleText>Gallery</ScrambleText>
            </h1>
            <p className="font-mono text-xs text-text-dim tracking-wider">
              <span className="text-accent/60">// </span>experiment archive
            </p>
          </div>
          <button onClick={() => { window.dispatchEvent(new Event('babel-glitch')); fetchExperiments() }} className="neural-btn" disabled={loading}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {/* Status filter tabs + controls toggle */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(0) }}
              className={
                statusFilter === filter
                  ? 'font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border bg-accent/15 border-accent/60 text-accent'
                  : 'font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border bg-transparent border-border-custom text-text-dim hover:border-accent/35'
              }
            >
              {filter}
            </button>
          ))}
          <span className="text-border-custom/40 mx-0.5">|</span>
          {/* Spec 018: Show/hide baseline control experiments */}
          <button
            onClick={() => setShowControls((v) => !v)}
            className={showControls
              ? 'font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border bg-amber-500/15 border-amber-500/60 text-amber-400'
              : 'font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border bg-transparent border-border-custom text-text-dim/50 hover:border-amber-500/35 hover:text-amber-400/70'}
          >
            controls
          </button>
        </div>
      </div>

      {/* Replication Groups (Spec 017) */}
      {replicationGroups.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50 px-1">
            Replication Groups
          </div>
          {replicationGroups.map((group) => {
            const statusColor =
              group.status === 'completed' ? 'text-emerald-400 border-emerald-500/30' :
              group.status === 'running'   ? 'text-accent border-accent/30' :
              group.status === 'partial'   ? 'text-amber-400 border-amber-500/30' :
              'text-danger border-danger/30'
            const modelA = group.model_a?.split('/').pop() ?? ''
            const modelB = group.model_b?.split('/').pop() ?? ''
            return (
              <div
                key={group.group_id}
                className="neural-row neural-row--completed cursor-pointer"
                onClick={() => navigate(`/replication/${group.group_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/replication/${group.group_id}`) }}
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] tracking-widest uppercase border px-1.5 py-0.5 rounded-sm text-violet-400 border-violet-500/30">
                        replication
                      </span>
                      <span className="font-mono text-[10px] text-accent border border-accent/30 px-1.5 py-0.5 rounded-sm font-bold">
                        n={group.count}
                      </span>
                      {group.preset && (
                        <span className="font-mono text-[9px] tracking-wider text-accent/55 border border-accent/20 px-1.5 py-0.5 rounded-sm uppercase">
                          {group.preset}
                        </span>
                      )}
                      {modelA && (
                        <span className="font-display text-sm font-bold tracking-wider uppercase text-text-primary">
                          {modelA} <span className="text-text-dim/60 font-mono text-[10px]">vs</span> {modelB}
                        </span>
                      )}
                      <span className={`font-mono text-[9px] tracking-widest uppercase border px-1.5 py-0.5 rounded-sm ${statusColor}`}>
                        {group.status}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-text-dim/50">
                      {new Date(group.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      <span className="text-accent/25 mx-1.5">&middot;</span>
                      {group.group_id}
                    </div>
                  </div>
                  <span className="font-mono text-[9px] text-accent/60 tracking-wider shrink-0">
                    View &rarr;
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">
          scanning archive...
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="font-mono text-xs text-danger">{error}</p>
      )}

      {/* Empty State */}
      {!loading && !error && standaloneExperiments.length === 0 && replicationGroups.length === 0 && (
        <div className="neural-card p-10 text-center space-y-4">
          <div className="neural-card-bar" />
          <p className="font-mono text-xs text-text-dim tracking-wider uppercase">// no records found</p>
          <Link to="/">
            <button className="neural-btn mt-2">Launch First Experiment</button>
          </Link>
        </div>
      )}

      {/* Experiment Log Rows (standalone only) */}
      {!loading && !error && standaloneExperiments.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[16px_1fr_auto_auto] gap-4 px-4 pb-1">
            <span />
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50">Pairing</span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50 text-right">Progress</span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50 w-32" />
          </div>

          {standaloneExperiments.filter((exp) => showControls || exp.preset !== 'baseline').map((exp) => {
            const isControl = exp.preset === 'baseline'
            const statuses = resolveSpritePair(exp.winner, exp.status)
            return (
              <div
                key={exp.id}
                className={rowStatusClass(exp.status)}
                style={presetBorderStyle(exp.preset)}
                onClick={() => navigate(`/analytics/${exp.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/analytics/${exp.id}`) } }}
              >
                <div className="px-4 py-3 flex items-center gap-4">
                  {/* Status dot */}
                  <span className="font-symbol">
                    <div className={dotStatusClass(exp.status)} />
                  </span>

                  {/* Model pairing + metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SpriteAvatar status={statuses.a} color="model-a" size={28} />
                      <ProviderSigil model={exp.model_a} size={13} color="rgba(245,158,11,0.75)" />
                      <span
                        className="font-display text-sm font-bold tracking-wider uppercase text-text-primary"
                        title={exp.model_a_version ? formatModelVersion(exp.model_a_version) : undefined}
                      >
                        {modelDisplayName(exp.model_a)}
                      </span>
                      <span className="font-mono text-[10px] text-text-dim/60">vs</span>
                      <SpriteAvatar status={statuses.b} color="model-b" size={28} />
                      <ProviderSigil model={exp.model_b} size={13} color="rgba(6,182,212,0.75)" />
                      <span
                        className="font-display text-sm font-bold tracking-wider uppercase text-text-primary"
                        title={exp.model_b_version ? formatModelVersion(exp.model_b_version) : undefined}
                      >
                        {modelDisplayName(exp.model_b)}
                      </span>
                      {exp.preset && (
                        <span className="font-mono text-[9px] tracking-wider text-accent/55 border border-accent/20 px-1.5 py-0.5 rounded-sm uppercase">
                          {exp.preset}
                        </span>
                      )}
                      {exp.judge_model && (
                        <span className="font-mono text-[9px] tracking-wider text-text-dim/40">
                          // judged
                        </span>
                      )}
                      {exp.mode === 'audit' && (
                        <span className="font-mono text-[9px] tracking-wider text-violet-400/80 border border-violet-500/30 px-1.5 py-0.5 rounded-sm uppercase">
                          audit
                        </span>
                      )}
                      {exp.mode === 'rpg' && (
                        <span className="font-mono text-[9px] tracking-wider text-emerald-400/80 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm uppercase">
                          rpg
                        </span>
                      )}
                      {exp.vocabulary_seed_id && (
                        <span className="font-mono text-[9px] tracking-wider text-cyan-400/70 border border-cyan-500/25 px-1.5 py-0.5 rounded-sm uppercase">
                          inherited
                        </span>
                      )}
                      {exp.hidden_goals_json && (
                        <span className="font-mono text-[9px] tracking-wider text-amber-400/70 border border-amber-500/25 px-1.5 py-0.5 rounded-sm uppercase">
                          adversarial
                        </span>
                      )}
                      {isControl && (
                        <span className="font-mono text-[9px] tracking-wider text-amber-400/90 border border-amber-500/50 px-1.5 py-0.5 rounded-sm uppercase font-bold">
                          control
                        </span>
                      )}
                      {exp.status === 'completed' && exp.chm_score != null && (
                        <span className="font-mono text-[9px] tracking-wider text-teal-400/80 border border-teal-500/30 px-1.5 py-0.5 rounded-sm">
                          CHM {exp.chm_score.toFixed(2)}
                        </span>
                      )}
                      {exp.hypothesis && !exp.hypothesis_result && (
                        <span className="font-mono text-[9px] tracking-wider text-text-dim/40 border border-border-custom px-1.5 py-0.5 rounded-sm uppercase italic">
                          hypothesis pending
                        </span>
                      )}
                      {exp.hypothesis_result === 'CONFIRMED' && (
                        <span className="font-mono text-[9px] tracking-wider text-emerald-400/90 border border-emerald-500/40 px-1.5 py-0.5 rounded-sm uppercase font-bold">
                          &#10003; confirmed
                        </span>
                      )}
                      {exp.hypothesis_result === 'REFUTED' && (
                        <span className="font-mono text-[9px] tracking-wider text-red-400/80 border border-red-500/30 px-1.5 py-0.5 rounded-sm uppercase font-bold">
                          &#10007; refuted
                        </span>
                      )}
                      {exp.hypothesis_result === 'INCONCLUSIVE' && (
                        <span className="font-mono text-[9px] tracking-wider text-amber-400/70 border border-amber-500/25 px-1.5 py-0.5 rounded-sm uppercase">
                          ~ inconclusive
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-text-dim/70 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{formatDate(exp.created_at)}</span>
                      <span className="text-accent/25">&middot;</span>
                      <span>{formatDuration(exp.elapsed_seconds)}</span>
                      {exp.label && (
                        <>
                          <span className="text-accent/25">&middot;</span>
                          <span className="text-accent/55 italic">{exp.label}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Round progress */}
                  <div className="shrink-0 text-right">
                    <span className="font-mono text-[10px] text-text-dim/70">
                      <span className="text-accent/60">RND</span>{' '}
                      {String(exp.rounds_completed).padStart(2, '0')}/
                      {String(exp.rounds_planned).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div
                    className="flex gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {exp.status === 'running' && (
                      <button
                        className="neural-btn neural-btn--active"
                        onClick={() => navigate(`/theater/${exp.id}`)}
                      >
                        Theater
                      </button>
                    )}
                    <button
                      className="neural-btn"
                      onClick={() => navigate(`/configure/${exp.preset ?? 'custom'}?remix=${exp.id}`)}
                    >
                      Remix
                    </button>
                    <button
                      className="neural-btn"
                      onClick={() => navigate(`/dictionary/${exp.id}`)}
                    >
                      Dict
                    </button>
                    {exp.status !== 'running' && (
                      confirmDelete === exp.id ? (
                        <button
                          className="neural-btn text-danger border-danger/40 hover:bg-danger/10"
                          onClick={async () => {
                            try {
                              await api.deleteExperiment(exp.id)
                              setConfirmDelete(null)
                              fetchExperiments()
                            } catch (err) {
                              console.error('Delete failed:', err)
                            }
                          }}
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          className="neural-btn text-danger/50 border-danger/20"
                          onClick={() => setConfirmDelete(exp.id)}
                        >
                          Del
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="neural-btn disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; Prev
            </button>
            <span className="font-mono text-[10px] text-text-dim tracking-wider">
              Page {page + 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={experiments.length < PAGE_SIZE}
              className="neural-btn disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

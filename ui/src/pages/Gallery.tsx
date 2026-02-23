import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord } from '@/api/types'
import { Button } from '@/components/ui/button'
import { ScrambleText } from '@/components/common/ScrambleText'
import { formatDuration } from '@/lib/format'

/** Extract a short display name from a litellm model string like "anthropic/claude-sonnet-4-..." */
function modelDisplayName(model: string): string {
  const after = model.split('/').pop() ?? model
  return after.replace(/-\d{8}$/, '')
}

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

const PAGE_SIZE = 20
const STATUS_FILTERS = ['all', 'running', 'completed', 'failed'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

export default function Gallery() {
  const navigate = useNavigate()
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchExperiments = () => {
    setLoading(true)
    const params: { limit: number; offset: number; status?: string } = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }
    if (statusFilter !== 'all') params.status = statusFilter
    api.listExperiments(params)
      .then((res) => setExperiments(res.experiments))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load experiments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchExperiments()
  }, [page, statusFilter])

  // Auto-poll if there are running experiments
  useEffect(() => {
    const hasRunning = experiments.some((e) => e.status === 'running')
    if (!hasRunning) return
    const interval = setInterval(fetchExperiments, 15_000)
    return () => clearInterval(interval)
  }, [experiments])

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
          <button onClick={fetchExperiments} className="neural-btn" disabled={loading}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(0) }}
              className={`font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm border transition-colors ${
                statusFilter === filter
                  ? 'bg-accent/15 border-accent/60 text-accent'
                  : 'bg-transparent border-border-custom text-text-dim hover:border-accent/35'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

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
      {!loading && !error && experiments.length === 0 && (
        <div className="neural-card p-10 text-center space-y-4">
          <div className="neural-card-bar" />
          <p className="font-mono text-xs text-text-dim tracking-wider uppercase">// no records found</p>
          <Link to="/">
            <button className="neural-btn mt-2">Launch First Experiment</button>
          </Link>
        </div>
      )}

      {/* Experiment Log Rows */}
      {!loading && !error && experiments.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[16px_1fr_auto_auto] gap-4 px-4 pb-1">
            <span />
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50">Pairing</span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50 text-right">Progress</span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-dim/50 w-32" />
          </div>

          {experiments.map((exp) => (
            <div
              key={exp.id}
              className={rowStatusClass(exp.status)}
              onClick={() => navigate(`/analytics/${exp.id}`)}
            >
              <div className="px-4 py-3 flex items-center gap-4">
                {/* Status dot */}
                <div className={dotStatusClass(exp.status)} />

                {/* Model pairing + metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-sm font-bold tracking-wider uppercase text-text-primary">
                      {modelDisplayName(exp.model_a)}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim/60">vs</span>
                    <span className="font-display text-sm font-bold tracking-wider uppercase text-text-primary">
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
                  </div>
                  <div className="font-mono text-[10px] text-text-dim/55 flex items-center gap-2 mt-0.5">
                    <span>{formatDate(exp.created_at)}</span>
                    <span className="text-accent/25">&middot;</span>
                    <span>{formatDuration(exp.elapsed_seconds)}</span>
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
          ))}

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

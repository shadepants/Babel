import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ExperimentRecord } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/** Extract a short display name from a litellm model string like "anthropic/claude-sonnet-4-..." */
function modelDisplayName(model: string): string {
  const after = model.split('/').pop() ?? model
  // Trim version suffixes like "-20250514"
  return after.replace(/-\d{8}$/, '')
}

/** Format elapsed seconds as "Xm Ys" or "Ys" */
function formatElapsed(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

/** Format ISO date string to short local date */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

  return (
    <Badge variant="secondary" className={`text-xs ${styles}`}>
      {status}
    </Badge>
  )
}

export default function Gallery() {
  const navigate = useNavigate()
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listExperiments()
      .then((res) => setExperiments(res.experiments))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load experiments'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Gallery</h1>
        <p className="text-text-dim">
          Past experiments and their results
        </p>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-text-dim animate-pulse-slow">Loading experiments...</p>
      )}
      {error && (
        <p className="text-center text-danger">{error}</p>
      )}

      {/* Empty State */}
      {!loading && !error && experiments.length === 0 && (
        <div className="text-center space-y-3 py-12">
          <p className="text-text-dim">No experiments yet</p>
          <Link to="/">
            <Button variant="outline" className="border-border-custom text-text-primary">
              Start one from Seed Lab
            </Button>
          </Link>
        </div>
      )}

      {/* Experiment Cards Grid */}
      {!loading && !error && experiments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp) => (
            <Card
              key={exp.id}
              className="bg-bg-card border-border-custom hover:bg-bg-card-hover cursor-pointer transition-colors group"
              onClick={() => navigate(`/analytics/${exp.id}`)}
            >
              <CardContent className="p-5 space-y-3">
                {/* Top row: status + preset */}
                <div className="flex items-start justify-between">
                  <StatusBadge status={exp.status} />
                  {exp.preset && (
                    <Badge variant="secondary" className="text-xs">
                      {exp.preset}
                    </Badge>
                  )}
                </div>

                {/* Model pairing */}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {modelDisplayName(exp.model_a)}
                    <span className="text-text-dim font-normal"> vs </span>
                    {modelDisplayName(exp.model_b)}
                  </h3>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-text-dim">
                  <span>{exp.rounds_completed}/{exp.rounds_planned} rounds</span>
                  <span className="text-border-custom">|</span>
                  <span>{formatElapsed(exp.elapsed_seconds)}</span>
                </div>

                {/* Date + quick nav */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-dim">{formatDate(exp.created_at)}</span>
                  <div className="flex gap-1.5">
                    {exp.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2 border-border-custom text-success"
                        onClick={(e) => { e.stopPropagation(); navigate(`/theater/${exp.id}`) }}
                      >
                        Theater
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2 border-border-custom text-text-dim"
                      onClick={(e) => { e.stopPropagation(); navigate(`/dictionary/${exp.id}`) }}
                    >
                      Dictionary
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

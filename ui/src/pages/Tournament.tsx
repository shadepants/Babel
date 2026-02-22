import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type {
  TournamentDetail,
  TournamentLeaderboard,
  LeaderboardEntry,
  RadarDataPoint,
} from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadarChart } from '@/components/analytics/RadarChart'

/** Extract short name from litellm model string */
function modelDisplayName(model: string): string {
  const after = model.split('/').pop() ?? model
  return after.replace(/-\d{8}$/, '')
}

const RADAR_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#a855f7', '#ec4899']
const RADAR_AXES = ['Verbosity', 'Speed', 'Creativity', 'Consistency', 'Engagement'] as const

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

function leaderboardToRadar(entries: LeaderboardEntry[]): RadarDataPoint[] {
  return entries.map((e, i) => ({
    model: e.model,
    display_name: e.display_name,
    color: RADAR_COLORS[i % RADAR_COLORS.length],
    axes: RADAR_AXES.map((axis) => ({
      axis,
      value: e[axis.toLowerCase() as keyof LeaderboardEntry] as number,
    })),
  }))
}

export default function Tournament() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!tournamentId) return
    try {
      const [detail, lb] = await Promise.all([
        api.getTournament(tournamentId),
        api.getTournamentLeaderboard(tournamentId),
      ])
      setTournament(detail)
      setLeaderboard(lb)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament')
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll while running
  useEffect(() => {
    if (!tournament || tournament.status !== 'running') return
    const interval = setInterval(fetchData, 8000)
    return () => clearInterval(interval)
  }, [tournament?.status, fetchData])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-dim animate-pulse-slow">Loading tournament...</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-danger">{error ?? 'Tournament not found'}</p>
          <Link to="/arena" className="text-accent hover:underline text-sm">Back to Arena</Link>
        </div>
      </div>
    )
  }

  const radarData = leaderboard ? leaderboardToRadar(leaderboard.entries) : []

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/arena" className="text-sm text-text-dim hover:text-accent transition-colors">
          &larr; Arena
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{tournament.name}</h1>
          <StatusBadge status={tournament.status} />
          {tournament.preset && (
            <Badge variant="secondary" className="text-xs">{tournament.preset}</Badge>
          )}
        </div>
        <p className="text-sm text-text-dim mt-1">
          {tournament.models.length} models &middot; {tournament.total_matches} matches
          &middot; {tournament.rounds} rounds each
          {tournament.status === 'running' && (
            <span className="ml-2 text-success">
              ({tournament.completed_matches}/{tournament.total_matches} complete)
            </span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      {tournament.status === 'running' && (
        <div className="w-full bg-bg-deep rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${(tournament.completed_matches / tournament.total_matches) * 100}%` }}
          />
        </div>
      )}

      {/* Match Grid */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tournament.matches.map((match) => (
            <Card
              key={match.id}
              className="bg-bg-card border-border-custom"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-dim">Match {match.match_order}</span>
                  <StatusBadge status={match.status} />
                </div>
                <div className="text-sm text-text-primary">
                  <span className="text-model-a">{modelDisplayName(match.model_a)}</span>
                  {' vs '}
                  <span className="text-model-b">{modelDisplayName(match.model_b)}</span>
                </div>
                {match.experiment_id && match.status === 'running' && (
                  <Link
                    to={`/theater/${match.experiment_id}`}
                    className="text-xs text-accent hover:underline"
                  >
                    Watch live
                  </Link>
                )}
                {match.experiment_id && match.status === 'completed' && (
                  <div className="flex gap-3">
                    <Link
                      to={`/analytics/${match.experiment_id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Analytics
                    </Link>
                    <Link
                      to={`/dictionary/${match.experiment_id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Dictionary
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard && leaderboard.entries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Leaderboard</h2>
          <div className="bg-bg-card border border-border-custom rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-custom text-text-dim text-xs">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Model</th>
                  <th className="text-right p-3">Matches</th>
                  <th className="text-right p-3">Avg Latency</th>
                  <th className="text-right p-3">Avg Tokens</th>
                  <th className="text-right p-3">Vocab Coined</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry, i) => (
                  <tr
                    key={entry.model}
                    className={`border-b border-border-custom/50 ${i === 0 ? 'bg-accent/5' : ''}`}
                  >
                    <td className="p-3 text-text-dim">
                      {i === 0 && tournament.status === 'completed' ? (
                        <span className="text-accent font-bold" title="Winner">1</span>
                      ) : (
                        i + 1
                      )}
                    </td>
                    <td className="p-3 text-text-primary font-medium">
                      {entry.display_name}
                      {i === 0 && tournament.status === 'completed' && (
                        <Badge variant="secondary" className="ml-2 text-xs bg-accent/20 text-accent">
                          Winner
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right text-text-dim">{entry.matches_played}</td>
                    <td className="p-3 text-right text-text-dim">
                      {entry.avg_latency != null ? `${entry.avg_latency}s` : '-'}
                    </td>
                    <td className="p-3 text-right text-text-dim">
                      {entry.avg_tokens != null ? Math.round(entry.avg_tokens) : '-'}
                    </td>
                    <td className="p-3 text-right font-semibold text-accent">
                      {entry.total_vocab_coined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Radar Chart */}
      {radarData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Model Personality</h2>
          <div className="bg-bg-card border border-border-custom rounded-lg p-4">
            <RadarChart data={radarData} height={350} />
          </div>
        </div>
      )}

      {/* Actions */}
      {tournament.status === 'completed' && (
        <div className="flex gap-3">
          <Link to="/arena">
            <Button variant="outline">New Tournament</Button>
          </Link>
          <Link to="/gallery">
            <Button variant="outline">View Gallery</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

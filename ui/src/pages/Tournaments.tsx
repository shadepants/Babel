import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { TournamentRecord } from '@/api/types'
import { ScrambleText } from '@/components/common/ScrambleText'

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listTournaments({ limit: 50 })
      .then((res) => setTournaments(res.tournaments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/arena" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
          &larr; Arena
        </Link>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary mt-3">
          <ScrambleText>Tournaments</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim mt-1 tracking-wider">
          <span className="text-accent/60">// </span>past tournament history
        </p>
      </div>

      {loading ? (
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">// loading tournaments...</p>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-mono text-sm text-text-dim">No tournaments yet</p>
          <Link to="/arena" className="font-mono text-xs text-accent hover:underline mt-2 inline-block">
            Launch your first tournament &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournament/${t.id}`}
              className={`neural-row neural-row--${t.status} block px-4 py-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-symbol block">
                    <div className={`status-dot status-dot--${t.status}`} />
                  </span>
                  <div>
                    <span className="font-mono text-sm text-text-primary">{t.name}</span>
                    {t.preset && (
                      <span className="ml-2 font-mono text-[10px] text-accent/60 border border-accent/20 px-1.5 py-0.5 rounded-sm">
                        {t.preset}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono text-[10px] text-text-dim tracking-wider">
                  <span>{t.models.length} models</span>
                  <span>{t.completed_matches}/{t.total_matches} matches</span>
                  <span>{t.rounds} rounds</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

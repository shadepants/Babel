import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ScrambleText } from '@/components/common/ScrambleText'
import { api } from '@/api/client'
import type { ModelStatusInfo } from '@/api/types'

/**
 * Settings page â€” API key status and model availability.
 */
export default function Settings() {
  const [models, setModels] = useState<ModelStatusInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getModelStatus()
      .then((res) => setModels(res.models))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group by provider
  const providers = models.reduce<Record<string, ModelStatusInfo[]>>((acc, m) => {
    acc[m.provider] = acc[m.provider] || []
    acc[m.provider].push(m)
    return acc
  }, {})

  const availableCount = models.filter((m) => m.available).length
  const allOk = availableCount === models.length && models.length > 0

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link to="/" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
          â† Seed Lab
        </Link>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary mt-3">
          <ScrambleText>Settings</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim mt-1 tracking-wider">
          <span className="text-accent/60">// </span>api key status &amp; model availability
        </p>
      </div>

      {/* Summary Panel */}
      <div className={`neural-provider ${allOk ? 'neural-provider--ok' : availableCount > 0 ? 'neural-provider--err' : 'neural-provider--err'}`}>
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`status-dot ${allOk ? 'status-dot--completed' : availableCount > 0 ? 'status-dot--pending' : 'status-dot--failed'}`} />
            <span className="font-mono text-xs text-text-dim tracking-wider uppercase">Model Availability</span>
          </div>
          <span className={`font-mono text-xs font-bold ${
            allOk ? 'text-success' : availableCount > 0 ? 'text-warning' : 'text-danger'
          }`}>
            {loading ? '...' : `${availableCount}/${models.length}`}
          </span>
        </div>
      </div>

      {/* Provider Groups */}
      {loading ? (
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">// checking api keys...</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(providers).map(([provider, providerModels]) => {
            const allAvailable = providerModels.every((m) => m.available)
            return (
              <div
                key={provider}
                className={`neural-provider ${allAvailable ? 'neural-provider--ok' : 'neural-provider--err'}`}
              >
                {/* Provider header */}
                <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className={`status-dot ${allAvailable ? 'status-dot--completed' : 'status-dot--failed'}`} />
                    <span className="font-display text-xs font-bold tracking-widest uppercase text-text-primary">
                      {provider}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] tracking-widest uppercase ${allAvailable ? 'text-success' : 'text-danger'}`}>
                    {allAvailable ? 'key configured' : 'key missing'}
                  </span>
                </div>

                {/* Models list */}
                <div className="px-5 py-3 space-y-2">
                  {providerModels.map((m) => (
                    <div key={m.model} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-text-dim">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <div className={`status-dot ${m.available ? 'status-dot--completed' : 'status-dot--failed'}`} />
                        <span className={`font-mono text-[10px] tracking-wider ${m.available ? 'text-success' : 'text-danger'}`}>
                          {m.available ? 'ok' : 'unavailable'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="font-mono text-[10px] text-text-dim/50 tracking-wider">
        // api keys read from environment variables â€” set in <code className="text-accent/60">.env</code> and restart backend
      </p>
    </div>
  )
}

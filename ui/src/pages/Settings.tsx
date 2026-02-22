import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ModelStatusInfo } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Settings page — API key status and model availability.
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

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/" className="text-sm text-text-dim hover:text-accent transition-colors">
          &larr; Seed Lab
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-3">Settings</h1>
        <p className="text-sm text-text-dim mt-1">API key status and model availability</p>
      </div>

      {/* Summary */}
      <Card className="bg-bg-card border-border-custom">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Model Availability</span>
            <Badge
              variant="secondary"
              className={`text-xs ${
                availableCount === models.length
                  ? 'bg-success/20 text-success'
                  : availableCount > 0
                    ? 'bg-warning/20 text-warning'
                    : 'bg-danger/20 text-danger'
              }`}
            >
              {loading ? '...' : `${availableCount}/${models.length} available`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Provider Groups */}
      {loading ? (
        <p className="text-text-dim animate-pulse-slow text-sm">Checking API keys...</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(providers).map(([provider, providerModels]) => {
            const allAvailable = providerModels.every((m) => m.available)
            return (
              <Card key={provider} className="bg-bg-card border-border-custom">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary capitalize">
                      {provider}
                    </span>
                    <span className={`text-xs ${allAvailable ? 'text-success' : 'text-danger'}`}>
                      {allAvailable ? 'Key configured' : 'Key missing'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {providerModels.map((m) => (
                      <div key={m.model} className="flex items-center justify-between text-sm">
                        <span className="text-text-dim">{m.name}</span>
                        <span className={m.available ? 'text-success' : 'text-danger'}>
                          {m.available ? '\u2713' : '\u2717'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-text-dim">
        API keys are read from environment variables. Set them in your <code>.env</code> file
        and restart the backend.
      </p>
    </div>
  )
}

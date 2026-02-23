import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ScrambleText } from '@/components/common/ScrambleText'
import { api } from '@/api/client'
import type { ModelStatusInfo } from '@/api/types'

type KeySaveState = 'idle' | 'saving' | 'ok' | 'fail'

/** Rough cost tier label per model id */
const COST_TIER: Record<string, string> = {
  'anthropic/claude-opus-4-6':            '$$$',
  'anthropic/claude-sonnet-4-6':          '$$',
  'anthropic/claude-sonnet-4-20250514':   '$$',
  'anthropic/claude-haiku-4-5-20251001':  '$',
  'gemini/gemini-2.5-pro':               '$$',
  'gemini/gemini-2.5-flash':             '$',
  'gemini/gemini-2.0-flash':             '$',
  'deepseek/deepseek-chat':              'c',
  'deepseek/deepseek-reasoner':          '$',
  'groq/llama-3.3-70b-versatile':        'c',
  'groq/llama-3.1-8b-instant':           'c',
  'mistral/mistral-large-latest':        '$$',
  'mistral/mistral-small-latest':        '$',
  'openai/gpt-4o':                       '$$$',
  'openai/gpt-4o-mini':                  '$',
  'openai/o3-mini':                      '$$',
  'sambanova/Meta-Llama-3.3-70B-Instruct': 'c',
  'cerebras/llama3.1-8b':                'c',
}

const TIER_COLOR: Record<string, string> = {
  '$$$': 'text-warning',
  '$$':  'text-accent',
  '$':   'text-success',
  'c':   'text-text-dim',
}

/**
 * Settings page — API key status, model availability, and in-app key configuration.
 */
export default function Settings() {
  const [models, setModels]       = useState<ModelStatusInfo[]>([])
  const [loading, setLoading]     = useState(true)

  // key input state keyed by env_var
  const [keyInputs,     setKeyInputs]     = useState<Record<string, string>>({})
  const [keySaveStates, setKeySaveStates] = useState<Record<string, KeySaveState>>({})
  const [keyErrors,     setKeyErrors]     = useState<Record<string, string>>({})
  const [showKeyInput,  setShowKeyInput]  = useState<Record<string, boolean>>({})

  const fetchModels = useCallback(() => {
    setLoading(true)
    api.getModelStatus()
      .then((res) => setModels(res.models))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchModels() }, [fetchModels])

  // Group by provider
  const providers = models.reduce<Record<string, ModelStatusInfo[]>>((acc, m) => {
    acc[m.provider] = acc[m.provider] || []
    acc[m.provider].push(m)
    return acc
  }, {})

  const availableCount = models.filter((m) => m.available).length
  const allOk = availableCount === models.length && models.length > 0

  const handleSetKey = async (envVar: string) => {
    const value = (keyInputs[envVar] ?? '').trim()
    if (!value) {
      setKeyErrors((prev) => ({ ...prev, [envVar]: 'Key cannot be empty' }))
      return
    }
    setKeyErrors((prev) => ({ ...prev, [envVar]: '' }))
    setKeySaveStates((prev) => ({ ...prev, [envVar]: 'saving' }))
    try {
      await api.setApiKey(envVar, value)
      setKeySaveStates((prev) => ({ ...prev, [envVar]: 'ok' }))
      setKeyInputs((prev) => ({ ...prev, [envVar]: '' }))
      setShowKeyInput((prev) => ({ ...prev, [envVar]: false }))
      // Refresh model status so the dot turns green
      setTimeout(fetchModels, 400)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setKeySaveStates((prev) => ({ ...prev, [envVar]: 'fail' }))
      setKeyErrors((prev) => ({ ...prev, [envVar]: msg }))
    }
  }

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link to="/" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
          &larr; Seed Lab
        </Link>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary mt-3">
          <ScrambleText>Settings</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim mt-1 tracking-wider">
          <span className="text-accent/60">// </span>api key status &amp; model availability
        </p>
      </div>

      {/* Summary Panel */}
      <div className={`neural-provider ${allOk ? 'neural-provider--ok' : 'neural-provider--err'}`}>
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
            const allAvailable  = providerModels.every((m) => m.available)
            const envVar        = providerModels[0].env_var
            const keyPreview    = providerModels[0].key_preview
            const saveState     = keySaveStates[envVar] ?? 'idle'
            const isShowingInput = showKeyInput[envVar] ?? false

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
                  <div className="flex items-center gap-3">
                    {keyPreview && (
                      <span className="font-mono text-[10px] text-text-dim/50 tracking-wider">{keyPreview}</span>
                    )}
                    <span className={`font-mono text-[10px] tracking-widest uppercase ${allAvailable ? 'text-success' : 'text-danger'}`}>
                      {allAvailable ? 'key configured' : 'key missing'}
                    </span>
                    <button
                      onClick={() => setShowKeyInput((prev) => ({ ...prev, [envVar]: !prev[envVar] }))}
                      className="font-mono text-[10px] tracking-widest uppercase text-text-dim hover:text-accent transition-colors border border-white/10 hover:border-accent/40 px-2 py-0.5 rounded"
                    >
                      {isShowingInput ? 'cancel' : allAvailable ? 'change key' : 'set key'}
                    </button>
                  </div>
                </div>

                {/* Key input (collapsed by default) */}
                {isShowingInput && (
                  <div className="px-5 py-3 border-b border-white/[0.04] space-y-2">
                    <p className="font-mono text-[10px] text-text-dim/60 tracking-wider">
                      // set <span className="text-accent/70">{envVar}</span> — saved to .env &amp; activated immediately
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="sk-..."
                        value={keyInputs[envVar] ?? ''}
                        onChange={(e) => {
                          setKeyInputs((prev) => ({ ...prev, [envVar]: e.target.value }))
                          setKeySaveStates((prev) => ({ ...prev, [envVar]: 'idle' }))
                          setKeyErrors((prev) => ({ ...prev, [envVar]: '' }))
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSetKey(envVar) }}
                        className="flex-1 bg-surface-1 border border-white/10 focus:border-accent/40 rounded px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim/40 outline-none transition-colors"
                      />
                      <button
                        onClick={() => handleSetKey(envVar)}
                        disabled={saveState === 'saving'}
                        className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 rounded border transition-colors disabled:opacity-50
                          border-accent/40 text-accent hover:bg-accent/10"
                      >
                        {saveState === 'saving' ? '...' : saveState === 'ok' ? 'saved' : 'save'}
                      </button>
                    </div>
                    {keyErrors[envVar] && (
                      <p className="font-mono text-[10px] text-danger tracking-wider">{keyErrors[envVar]}</p>
                    )}
                    {saveState === 'ok' && (
                      <p className="font-mono text-[10px] text-success tracking-wider">// key saved and active</p>
                    )}
                  </div>
                )}

                {/* Models list */}
                <div className="px-5 py-3 space-y-2">
                  {providerModels.map((m) => {
                    const tier      = COST_TIER[m.model]
                    const tierColor = tier ? TIER_COLOR[tier] ?? 'text-text-dim' : null
                    return (
                      <div key={m.model} className="flex items-center justify-between">
                        <span className="font-mono text-xs text-text-dim">{m.name}</span>
                        <div className="flex items-center gap-3">
                          {tier && (
                            <span className={`font-mono text-[10px] tracking-wider ${tierColor}`} title="cost tier">
                              {tier}
                            </span>
                          )}
                          <div className={`status-dot ${m.available ? 'status-dot--completed' : 'status-dot--failed'}`} />
                          <span className={`font-mono text-[10px] tracking-wider ${m.available ? 'text-success' : 'text-danger'}`}>
                            {m.available ? 'ok' : 'unavailable'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="font-mono text-[10px] text-text-dim/50 tracking-wider">
        // keys saved to <code className="text-accent/60">.env</code> &mdash; active immediately, no restart required
      </p>
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ScrambleText } from '@/components/common/ScrambleText'
import { Slider } from '@/components/ui/slider'
import { api } from '@/api/client'
import type { ModelStatusInfo, PersonaRecord } from '@/api/types'
import { getPrefs, savePrefs, resetPrefs, FACTORY_DEFAULTS, type BabelPrefs } from '@/lib/prefs'

type KeySaveState = 'idle' | 'saving' | 'ok' | 'fail'

const PERSONA_COLORS = ['#F59E0B', '#10B981', '#6366F1', '#EC4899']

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

  // ── App Defaults state (localStorage) ──
  const [prefs, setPrefsState] = useState<BabelPrefs>(getPrefs())

  function updatePref<K extends keyof BabelPrefs>(key: K, value: BabelPrefs[K]) {
    savePrefs({ [key]: value })
    setPrefsState(getPrefs())
  }

  // ── Memory Bank state ──
  type MemoryRow = { model_a: string; model_b: string; summary: string; created_at: string }
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [memoriesLoaded, setMemoriesLoaded] = useState(false)

  const fetchMemories = useCallback(() => {
    api.getMemories().then((r) => { setMemories(r.memories); setMemoriesLoaded(true) }).catch(() => setMemoriesLoaded(true))
  }, [])
  useEffect(() => { fetchMemories() }, [fetchMemories])

  const handleClearMemory = async (modelA: string, modelB: string) => {
    await api.deleteMemories(modelA, modelB)
    setMemories((m) => m.filter((row) => !(row.model_a === modelA && row.model_b === modelB)))
  }

  // ── Personas state ──
  const [personas,       setPersonas]       = useState<PersonaRecord[]>([])
  const [showNewPersona, setShowNewPersona] = useState(false)
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [personaForm,    setPersonaForm]    = useState({
    name: '', personality: '', backstory: '', avatar_color: '#F59E0B',
  })
  const [personaSaving,  setPersonaSaving]  = useState(false)

  const fetchModels = useCallback(() => {
    setLoading(true)
    api.getModelStatus()
      .then((res) => setModels(res.models))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchModels() }, [fetchModels])

  const fetchPersonas = useCallback(() => {
    api.getPersonas().then(setPersonas).catch(() => {})
  }, [])
  useEffect(() => { fetchPersonas() }, [fetchPersonas])

  const handlePersonaSave = async () => {
    if (!personaForm.name.trim()) return
    setPersonaSaving(true)
    try {
      if (editingId) {
        await api.updatePersona(editingId, personaForm)
      } else {
        await api.createPersona(personaForm)
      }
      setPersonaForm({ name: '', personality: '', backstory: '', avatar_color: '#F59E0B' })
      setShowNewPersona(false)
      setEditingId(null)
      fetchPersonas()
    } catch { /* ignore */ }
    finally { setPersonaSaving(false) }
  }

  const handlePersonaEdit = (p: PersonaRecord) => {
    setPersonaForm({ name: p.name, personality: p.personality, backstory: p.backstory, avatar_color: p.avatar_color })
    setEditingId(p.id)
    setShowNewPersona(true)
  }

  const handlePersonaDelete = async (id: string) => {
    await api.deletePersona(id)
    fetchPersonas()
  }

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

      {/* App Defaults Panel */}
      <div className="neural-provider neural-provider--ok">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold tracking-widest uppercase text-text-primary">
              <ScrambleText>App Defaults</ScrambleText>
            </span>
            <span className="font-mono text-[10px] text-text-dim/60 tracking-wider">applied to new custom experiments</span>
          </div>
          <button
            onClick={() => { resetPrefs(); setPrefsState(getPrefs()) }}
            className="font-mono text-[10px] tracking-widest uppercase text-text-dim hover:text-accent transition-colors border border-white/10 hover:border-accent/40 px-2 py-0.5 rounded"
          >
            reset
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="font-mono text-[9px] text-text-dim/50 tracking-wider">
            // pre-fills sliders when you open a custom experiment
          </p>
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
              Default Temperature <span className="text-accent/60">[{prefs.defaultTemperature.toFixed(1)}]</span>
              {prefs.defaultTemperature !== FACTORY_DEFAULTS.defaultTemperature && (
                <span className="ml-1.5 text-accent/60" title="modified">&#9679;</span>
              )}
            </label>
            <Slider
              value={[prefs.defaultTemperature]}
              onValueChange={(v) => updatePref('defaultTemperature', v[0])}
              min={0} max={2} step={0.1}
            />
            <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
              <span>0 precise</span><span>2 creative</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
              Default Rounds <span className="text-accent/60">[{prefs.defaultRounds}]</span>
              {prefs.defaultRounds !== FACTORY_DEFAULTS.defaultRounds && (
                <span className="ml-1.5 text-accent/60" title="modified">&#9679;</span>
              )}
            </label>
            <Slider
              value={[prefs.defaultRounds]}
              onValueChange={(v) => updatePref('defaultRounds', v[0])}
              min={1} max={15} step={1}
            />
            <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
              <span>1</span><span>15</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
              Default Max Tokens <span className="text-accent/60">[{prefs.defaultMaxTokens}]</span>
              {prefs.defaultMaxTokens !== FACTORY_DEFAULTS.defaultMaxTokens && (
                <span className="ml-1.5 text-accent/60" title="modified">&#9679;</span>
              )}
            </label>
            <Slider
              value={[prefs.defaultMaxTokens]}
              onValueChange={(v) => updatePref('defaultMaxTokens', v[0])}
              min={100} max={4096} step={100}
            />
            <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
              <span>100</span><span>4096</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
              Default Turn Delay <span className="text-accent/60">[{prefs.defaultTurnDelay.toFixed(1)}s]</span>
              {prefs.defaultTurnDelay !== FACTORY_DEFAULTS.defaultTurnDelay && (
                <span className="ml-1.5 text-accent/60" title="modified">&#9679;</span>
              )}
            </label>
            <Slider
              value={[prefs.defaultTurnDelay]}
              onValueChange={(v) => updatePref('defaultTurnDelay', v[0])}
              min={0} max={10} step={0.5}
            />
            <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
              <span>0s instant</span><span>10s slow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Bank Panel */}
      <div className="neural-provider neural-provider--ok">
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <span className="font-display text-xs font-bold tracking-widest uppercase text-text-primary">
            <ScrambleText>Memory Bank</ScrambleText>
          </span>
          <p className="font-mono text-[9px] text-text-dim/50 tracking-wider mt-1">
            // vocabulary summaries saved from past sessions with memory enabled
          </p>
        </div>
        <div className="px-5 py-3 space-y-2">
          {!memoriesLoaded && (
            <p className="font-mono text-[10px] text-text-dim/40 animate-pulse-slow tracking-wider">// loading...</p>
          )}
          {memoriesLoaded && memories.length === 0 && (
            <p className="font-mono text-[10px] text-text-dim/40 tracking-wider">
              // no memories yet &mdash; run a session with memory enabled
            </p>
          )}
          {memories.map((row) => (
            <div key={row.model_a + row.model_b} className="flex items-start gap-3 py-1 border-b border-white/[0.03] last:border-0">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-text-primary">{row.model_a.split('/').pop()}</span>
                  <span className="font-mono text-[9px] text-text-dim/40">&harr;</span>
                  <span className="font-mono text-[10px] text-text-primary">{row.model_b.split('/').pop()}</span>
                  <span className="font-mono text-[9px] text-text-dim/40 ml-2">{row.created_at.slice(0, 10)}</span>
                </div>
                {row.summary && (
                  <p className="font-mono text-[9px] text-text-dim/60 truncate">{row.summary.slice(0, 90)}{row.summary.length > 90 ? '...' : ''}</p>
                )}
              </div>
              <button
                onClick={() => handleClearMemory(row.model_a, row.model_b)}
                className="font-mono text-[10px] text-text-dim hover:text-danger transition-colors flex-shrink-0"
              >
                clear
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Personas Panel */}
      <div className="neural-provider neural-provider--ok">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold tracking-widest uppercase text-text-primary">
              <ScrambleText>Personas</ScrambleText>
            </span>
            <span className="font-mono text-[10px] text-text-dim/60 tracking-wider">
              {personas.length} defined
            </span>
          </div>
          <button
            onClick={() => {
              setPersonaForm({ name: '', personality: '', backstory: '', avatar_color: '#F59E0B' })
              setEditingId(null)
              setShowNewPersona((v) => !v)
            }}
            className="font-mono text-[10px] tracking-widest uppercase text-text-dim hover:text-accent transition-colors border border-white/10 hover:border-accent/40 px-2 py-0.5 rounded"
          >
            {showNewPersona && !editingId ? 'cancel' : '+ new'}
          </button>
        </div>

        {/* New / Edit form */}
        {showNewPersona && (
          <div className="px-5 py-4 border-b border-white/[0.04] space-y-3">
            <p className="font-mono text-[10px] text-accent/60 tracking-widest uppercase">
              {editingId ? '// edit persona' : '// new persona'}
            </p>
            <input
              type="text"
              placeholder="Name (e.g. Zephyr)"
              value={personaForm.name}
              onChange={(e) => setPersonaForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-surface-1 border border-white/10 focus:border-accent/40 rounded px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim/40 outline-none transition-colors"
            />
            <textarea
              rows={2}
              placeholder="Personality (e.g. cryptic oracle who speaks in riddles)"
              value={personaForm.personality}
              onChange={(e) => setPersonaForm((f) => ({ ...f, personality: e.target.value }))}
              className="w-full bg-surface-1 border border-white/10 focus:border-accent/40 rounded px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim/40 outline-none transition-colors resize-none"
            />
            <textarea
              rows={3}
              placeholder="Backstory / lore (optional)"
              value={personaForm.backstory}
              onChange={(e) => setPersonaForm((f) => ({ ...f, backstory: e.target.value }))}
              className="w-full bg-surface-1 border border-white/10 focus:border-accent/40 rounded px-3 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim/40 outline-none transition-colors resize-none"
            />
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-text-dim/60 tracking-wider">color:</span>
              {PERSONA_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPersonaForm((f) => ({ ...f, avatar_color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition-transform ${personaForm.avatar_color === c ? 'scale-125 ring-2 ring-white/40' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
              <button
                onClick={handlePersonaSave}
                disabled={personaSaving || !personaForm.name.trim()}
                className="ml-auto font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 rounded border border-accent/40 text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
              >
                {personaSaving ? '...' : editingId ? 'update' : 'create'}
              </button>
            </div>
          </div>
        )}

        {/* Personas list */}
        <div className="px-5 py-3 space-y-2">
          {personas.length === 0 && (
            <p className="font-mono text-[10px] text-text-dim/40 tracking-wider">// no personas yet</p>
          )}
          {personas.map((p) => (
            <div key={p.id} className="flex items-start gap-3 py-1">
              <div
                className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.avatar_color }}
              />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-text-primary">{p.name}</span>
                {p.personality && (
                  <p className="font-mono text-[10px] text-text-dim/60 truncate">{p.personality}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handlePersonaEdit(p)}
                  className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors"
                >
                  edit
                </button>
                <button
                  onClick={() => handlePersonaDelete(p.id)}
                  className="font-mono text-[10px] text-text-dim hover:text-danger transition-colors"
                >
                  del
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
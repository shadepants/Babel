import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { Preset, ModelInfo, ModelStatusInfo } from '@/api/types'
import { Button } from '@/components/ui/button'
import { ScrambleText } from '@/components/common/ScrambleText'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { getSymbol } from '@/lib/symbols'
import { getPrefs } from '@/lib/prefs'
import { getPresetGlow } from '@/lib/presetColors'
import { AGENT_COLORS } from '@/components/theater/ConversationColumn'

// Agent slot state -- model + temperature per agent
interface AgentSlot { model: string; temperature: number }

// Tailwind can't purge dynamic class names; use explicit per-index color labels
const AGENT_LABELS = ['Model A', 'Model B', 'Model C', 'Model D']

export default function Configure() {
  const { presetId } = useParams<{ presetId: string }>()
  const navigate = useNavigate()
  const isCustom = presetId === 'custom'
  const [searchParams] = useSearchParams()
  const remixId = searchParams.get('remix')
  const forkId = searchParams.get('fork')
  const formAccentColor = isCustom ? null : getPresetGlow(presetId)

  // -- Data loading --
  const [preset, setPreset] = useState<Preset | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelStatus, setModelStatus] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // -- Form state --
  // Phase 15-A: N-way agents (2-4 slots, each with model + temperature)
  const [agents, setAgents] = useState<AgentSlot[]>([
    { model: '', temperature: 0.7 },
    { model: '', temperature: 0.7 },
  ])
  const [rounds, setRounds] = useState(5)
  const [maxTokens, setMaxTokens] = useState(1500)
  const [seed, setSeed] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [turnDelay, setTurnDelay] = useState(2.0)
  const [seedEditing, setSeedEditing] = useState(false)
  const [promptEditing, setPromptEditing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // -- Referee / scoring --
  const [judgeModel, setJudgeModel] = useState<string>('auto')
  const [enableScoring, setEnableScoring] = useState(false)
  const [enableVerdict, setEnableVerdict] = useState(false)

  // -- Memory --
  const [enableMemory, setEnableMemory] = useState(false)

  // -- Observer --
  const [observerModel, setObserverModel] = useState<string>('none')
  const [observerInterval, setObserverInterval] = useState(3)

  // -- Fork state --
  const [forkHistory, setForkHistory] = useState<Array<{ speaker: string; content: string }> | null>(null)

  // -- RPG Mode --
  const [rpgMode, setRpgMode] = useState(false)
  const [rpgParticipants, setRpgParticipants] = useState<Array<{ name: string; model: string; role: string }>>([
    { name: 'Player', model: 'human', role: 'player' },
  ])

  // Preset defaults -- for divergence indicators + reset (null when custom)
  const [presetDefaults, setPresetDefaults] = useState<{ rounds: number; temperature: number; maxTokens: number } | null>(null)
  // Suggested model strings from preset (for C3 indicator)
  const [suggestedModels, setSuggestedModels] = useState<[string, string]>(['', ''])

  // Load models + preset data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [modelsRes, presetsRes, statusRes] = await Promise.all([
          api.getModels(),
          isCustom ? Promise.resolve(null) : api.getPresets(),
          api.getModelStatus(),
        ])

        setModels(modelsRes.models)
        const statusMap = new Map<string, boolean>()
        statusRes.models.forEach((s: ModelStatusInfo) => statusMap.set(s.model, s.available))
        setModelStatus(statusMap)

        if (isCustom) {
          if (modelsRes.models.length >= 2) {
            const prefs = getPrefs()
            setAgents([
              { model: modelsRes.models[0].model, temperature: prefs.defaultTemperature },
              { model: modelsRes.models[1].model, temperature: prefs.defaultTemperature },
            ])
            setRounds(prefs.defaultRounds)
            setMaxTokens(prefs.defaultMaxTokens)
            setTurnDelay(prefs.defaultTurnDelay)
          }
          setSeedEditing(true)
        } else if (presetsRes) {
          const found = presetsRes.presets.find((p) => p.id === presetId)
          if (!found) {
            setLoadError(`Preset "${presetId}" not found`)
            return
          }
          setPreset(found)
          setSeed(found.seed)
          setSystemPrompt(found.system_prompt)
          setRounds(found.defaults.rounds)
          setMaxTokens(found.defaults.max_tokens)
          setPresetDefaults({
            rounds: found.defaults.rounds,
            temperature: found.defaults.temperature,
            maxTokens: found.defaults.max_tokens,
          })

          const sugA = modelsRes.models.find((m) => m.name === found.suggested_models.a)
          const sugB = modelsRes.models.find((m) => m.name === found.suggested_models.b)
          const resolvedA = sugA?.model ?? modelsRes.models[0]?.model ?? ''
          const resolvedB = sugB?.model ?? modelsRes.models[1]?.model ?? ''
          setAgents([
            { model: resolvedA, temperature: found.defaults.temperature },
            { model: resolvedB, temperature: found.defaults.temperature },
          ])
          setSuggestedModels([resolvedA, resolvedB])
        }

        // Remix: pre-fill models/temps/seed from that experiment
        if (remixId) {
          try {
            const remixExp = await api.getExperiment(remixId)
            setAgents(prev => {
              const next = [...prev]
              next[0] = { model: remixExp.model_a, temperature: remixExp.temperature_a ?? prev[0].temperature }
              next[1] = { model: remixExp.model_b, temperature: remixExp.temperature_b ?? prev[1].temperature }
              return next
            })
            if (remixExp.seed) { setSeed(remixExp.seed); setSeedEditing(true) }
          } catch {
            // remix experiment not found -- continue with preset defaults
          }
        }

        // Fork: pre-fill settings + load turn history as initial_history
        if (forkId) {
          try {
            const [forkExp, forkTurns] = await Promise.all([
              api.getExperiment(forkId),
              api.getExperimentTurns(forkId),
            ])
            setAgents(prev => {
              const next = [...prev]
              next[0] = { model: forkExp.model_a, temperature: forkExp.temperature_a ?? prev[0].temperature }
              next[1] = { model: forkExp.model_b, temperature: forkExp.temperature_b ?? prev[1].temperature }
              return next
            })
            if (forkExp.seed) { setSeed(forkExp.seed); setSeedEditing(true) }
            setForkHistory(forkTurns.turns.map((t) => ({ speaker: t.speaker, content: t.content })))
          } catch {
            // fork experiment not found -- continue with preset defaults
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [presetId, isCustom, remixId, forkId])

  // Whether any parameter has been moved from the preset default
  const hasParamChanges = presetDefaults !== null && (
    rounds !== presetDefaults.rounds ||
    maxTokens !== presetDefaults.maxTokens ||
    agents.some(a => a.temperature !== presetDefaults.temperature)
  )

  function handleResetParams() {
    if (!presetDefaults) return
    setRounds(presetDefaults.rounds)
    setMaxTokens(presetDefaults.maxTokens)
    setAgents(prev => prev.map(a => ({ ...a, temperature: presetDefaults.temperature })))
  }

  // Agent slot helpers
  function updateAgent(idx: number, patch: Partial<AgentSlot>) {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
  }
  function addAgent() {
    if (agents.length >= 4) return
    setAgents(prev => [...prev, { model: '', temperature: 0.7 }])
  }
  function removeAgent(idx: number) {
    if (agents.length <= 2) return
    setAgents(prev => prev.filter((_, i) => i !== idx))
  }
  function swapAB() {
    setAgents(prev => {
      const next = [...prev]
      const tmp = next[0]
      next[0] = next[1]
      next[1] = tmp
      return next
    })
  }

  async function handleLaunch() {
    const activeModel = agents[0]?.model
    if (!activeModel || (!rpgMode && agents.some(a => !a.model))) {
      setFormError(rpgMode ? 'Please select a DM model.' : 'Please select models for all agents.')
      return
    }
    if (!seed.trim()) {
      setFormError('Please enter a seed message.')
      return
    }

    setStarting(true)
    setFormError(null)

    try {
      const allParticipants = rpgMode
        ? [{ name: 'DM', model: activeModel, role: 'dm' }, ...rpgParticipants]
        : undefined

      // Build the agents array with display names for speaker identification
      const agentsPayload = rpgMode ? undefined : agents.map((a) => ({
        model: a.model,
        temperature: a.temperature,
        name: models.find((m) => m.model === a.model)?.name ?? a.model.split('/').pop() ?? a.model,
      }))

      const request: Parameters<typeof api.startRelay>[0] = {
        // Phase 15-A: N-way agents path
        ...(agentsPayload ? { agents: agentsPayload } : {}),
        // Legacy fields kept for RPG mode and backward compat
        model_a: activeModel,
        model_b: rpgMode ? activeModel : (agents[1]?.model ?? ''),
        seed: seed.trim(),
        rounds,
        temperature_a: agents[0]?.temperature ?? 0.7,
        temperature_b: rpgMode ? (agents[0]?.temperature ?? 0.7) : (agents[1]?.temperature ?? 0.7),
        max_tokens: maxTokens,
        turn_delay_seconds: turnDelay,
        enable_scoring: enableScoring,
        enable_verdict: enableVerdict,
        enable_memory: enableMemory,
        ...(rpgMode ? { mode: 'rpg' as const, participants: allParticipants } : {}),
        ...(judgeModel && judgeModel !== 'auto' ? { judge_model: judgeModel } : {}),
        ...(observerModel && observerModel !== 'none' ? { observer_model: observerModel, observer_interval: observerInterval } : {}),
      }
      if (!isCustom && presetId) {
        request.preset = presetId
      }
      if (forkId && forkHistory) {
        request.initial_history = forkHistory
        request.parent_experiment_id = forkId
        request.fork_at_round = forkHistory.length
      }
      if (systemPrompt.trim()) {
        request.system_prompt = systemPrompt.trim()
      }

      const res = await api.startRelay(request)

      if (rpgMode) {
        navigate(`/rpg/${res.match_id}`)
      } else {
        navigate(`/theater/${res.match_id}`, {
          state: {
            modelAName: agentsPayload?.[0]?.name ?? agents[0]?.model ?? '',
            modelBName: agentsPayload?.[1]?.name ?? agents[1]?.model ?? '',
          },
        })
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start experiment')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">initializing...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-mono text-xs text-danger">{loadError}</p>
          <Link to="/" className="font-mono text-[10px] text-accent hover:text-accent/80 tracking-widest uppercase">
            &larr; Back to Seed Lab
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
          &larr; Seed Lab
        </Link>

        <div className="mt-4 flex items-center gap-4">
          {preset && (
            <span className="font-mono text-3xl text-accent/50 leading-none select-none">
              {getSymbol(preset.emoji)}
            </span>
          )}
          {isCustom && (
            <span className="font-mono text-3xl text-accent/35 leading-none select-none">&#9671;</span>
          )}
          <div>
            <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
              <ScrambleText>{isCustom ? 'Custom' : (preset?.name ?? '')}</ScrambleText>
            </h1>
            {preset && (
              <p className="font-mono text-[10px] text-text-dim mt-0.5 tracking-wider">
                <span className="text-accent/60">// </span>{preset.description}
              </p>
            )}
          </div>
        </div>

        {preset && preset.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {preset.tags.map((tag) => (
              <span key={tag} className="font-mono text-[9px] tracking-wider text-accent/55 border border-accent/20 px-1.5 py-0.5 rounded-sm uppercase">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fork banner */}
      {forkId && forkHistory && (
        <div className="font-mono text-xs border border-cyan-500/30 bg-cyan-500/5 rounded px-3 py-2 text-cyan-400">
          <span className="opacity-60">// </span>
          FORKED FROM{' '}
          <span className="text-cyan-300">{forkId}</span>
          <span className="text-cyan-500/60"> &middot; {forkHistory.length} turns loaded into context</span>
        </div>
      )}

      {/* Configuration Form */}
      <div
        className="neural-card"
        style={formAccentColor ? { borderTop: '2px solid ' + formAccentColor.replace(/,\s*[\d.]+\)$/, ', 0.70)') } : undefined}
      >
        <div className="neural-card-bar" />
        <div className="p-6 space-y-6">

          {/* RPG Mode Toggle */}
          <div className="space-y-3">
            <div className="neural-section-label">// mode</div>
            <button
              type="button"
              onClick={() => setRpgMode(!rpgMode)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${rpgMode ? 'bg-emerald-500/70' : 'bg-border-custom'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${rpgMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                RPG Mode
              </span>
            </button>
            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              {rpgMode
                ? '// AI dungeon master + human player. Model A becomes the DM.'
                : '// Standard N-way relay conversation (2-4 models)'}
            </p>
          </div>

          {/* Models -- N-way agent slots */}
          <div className="space-y-3">
            <div className="neural-section-label flex items-center justify-between">
              <span>// {rpgMode ? 'dm_model' : 'model_selection'}</span>
              <div className="flex items-center gap-3">
                {!rpgMode && (
                  <button
                    type="button"
                    onClick={swapAB}
                    className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                    title="Swap Model A and Model B"
                  >
                    &#8646; swap A&#8596;B
                  </button>
                )}
                {!rpgMode && agents.length < 4 && (
                  <button
                    type="button"
                    onClick={addAgent}
                    className="font-mono text-[9px] text-emerald-400/60 hover:text-emerald-400 tracking-wider uppercase transition-colors"
                    title="Add a third or fourth model"
                  >
                    + Add Agent
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {(rpgMode ? agents.slice(0, 1) : agents).map((agent, idx) => {
                const agentColor = AGENT_COLORS[idx] ?? AGENT_COLORS[0]
                const label = AGENT_LABELS[idx] ?? `Agent ${idx + 1}`
                const isSuggested = !isCustom && suggestedModels[idx] && agent.model === suggestedModels[idx]
                const keyUnavailable = agent.model && modelStatus.get(agent.model) === false
                return (
                  <div key={idx} className="space-y-2 p-3 border border-border-custom/40 rounded-sm bg-bg-deep/30">
                    <div className="flex items-center justify-between">
                      <label
                        className="font-mono text-[10px] tracking-wider uppercase"
                        style={{ color: agentColor }}
                      >
                        &#9671; {label}
                      </label>
                      {!rpgMode && agents.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAgent(idx)}
                          className="font-mono text-[10px] text-danger/50 hover:text-danger transition-colors"
                          title="Remove this agent"
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                    <Select value={agent.model} onValueChange={(v) => updateAgent(idx, { model: v })}>
                      <SelectTrigger
                        className="font-mono text-xs"
                        style={{ borderColor: agentColor + '4d' }}
                      >
                        <SelectValue placeholder="Select model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                            {m.name}
                            {modelStatus.get(m.model) === false && <span className="ml-1 text-danger/70">&#9679;</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {keyUnavailable && (
                      <p className="font-mono text-[9px] text-danger/80 tracking-wider">// api key not configured</p>
                    )}
                    {isSuggested && (
                      <p className="font-mono text-[9px] text-accent/45 tracking-wider">// preset suggestion</p>
                    )}
                    {/* Per-agent temperature */}
                    <div className="space-y-1 pt-1">
                      <label className="font-mono text-[9px] tracking-wider uppercase block" style={{ color: agentColor + 'aa' }}>
                        Temperature <span className="text-accent/60">[{agent.temperature.toFixed(1)}]</span>
                        {presetDefaults && agent.temperature !== presetDefaults.temperature && (
                          <span className="ml-1.5 opacity-70" title="modified from preset default" style={{ color: agentColor }}>&#9679;</span>
                        )}
                      </label>
                      <Slider
                        value={[agent.temperature]}
                        onValueChange={(v) => updateAgent(idx, { temperature: v[0] })}
                        min={0} max={2} step={0.1}
                      />
                      <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                        <span>0 precise</span><span>2 creative</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RPG Participants */}
          {rpgMode && (
            <div className="space-y-3">
              <div className="neural-section-label flex items-center justify-between">
                <span>// party_members</span>
                <button
                  type="button"
                  onClick={() => setRpgParticipants([...rpgParticipants, { name: '', model: 'human', role: 'player' }])}
                  className="font-mono text-[9px] text-emerald-400/60 hover:text-emerald-400 tracking-wider uppercase transition-colors"
                >
                  + add member
                </button>
              </div>
              {rpgParticipants.map((p, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">Name</label>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const next = [...rpgParticipants]
                        next[i] = { ...next[i], name: e.target.value }
                        setRpgParticipants(next)
                      }}
                      className="w-full bg-bg-deep/80 border border-border-custom/50 rounded-sm px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-emerald-500/50"
                      placeholder="Character name"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">Role</label>
                    <Select
                      value={p.role}
                      onValueChange={(v) => {
                        const next = [...rpgParticipants]
                        next[i] = { ...next[i], role: v }
                        setRpgParticipants(next)
                      }}
                    >
                      <SelectTrigger className="font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player" className="font-mono text-xs">Player</SelectItem>
                        <SelectItem value="npc" className="font-mono text-xs">NPC (AI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40 space-y-1">
                    <label className="font-mono text-[9px] text-text-dim/60 tracking-wider uppercase block">Model</label>
                    {p.role === 'player' ? (
                      <div className="bg-bg-deep/80 border border-emerald-500/20 rounded-sm px-2 py-1.5 font-mono text-xs text-emerald-400/70">
                        Human
                      </div>
                    ) : (
                      <Select
                        value={p.model === 'human' ? (models[0]?.model ?? '') : p.model}
                        onValueChange={(v) => {
                          const next = [...rpgParticipants]
                          next[i] = { ...next[i], model: v }
                          setRpgParticipants(next)
                        }}
                      >
                        <SelectTrigger className="font-mono text-xs">
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {rpgParticipants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRpgParticipants(rpgParticipants.filter((_, j) => j !== i))}
                      className="text-danger/50 hover:text-danger font-mono text-xs pb-1.5 transition-colors"
                      title="Remove"
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              ))}
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // DM is auto-added from the model above. Players use human input; NPCs use AI.
              </p>
            </div>
          )}

          {/* Parameters */}
          <div className="space-y-4">
            <div className="neural-section-label flex items-center justify-between">
              <span>// parameters</span>
              {hasParamChanges && (
                <button
                  onClick={handleResetParams}
                  className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                  title="Reset to preset defaults"
                >
                  &#8635; reset
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Rounds <span className="text-accent/60">[{rounds}]</span>
                {presetDefaults && rounds !== presetDefaults.rounds && (
                  <span className="ml-1.5 text-model-a/70" title="modified from preset default">&#9679;</span>
                )}
              </label>
              <Slider value={[rounds]} onValueChange={(v) => setRounds(v[0])} min={1} max={15} step={1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>1</span><span>15</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Max Tokens <span className="text-accent/60">[{maxTokens}]</span>
                {presetDefaults && maxTokens !== presetDefaults.maxTokens && (
                  <span className="ml-1.5 text-model-a/70" title="modified from preset default">&#9679;</span>
                )}
              </label>
              <Slider value={[maxTokens]} onValueChange={(v) => setMaxTokens(v[0])} min={100} max={4096} step={100} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>100</span><span>4096</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Turn Delay <span className="text-accent/60">[{turnDelay.toFixed(1)}s]</span>
              </label>
              <Slider value={[turnDelay]} onValueChange={(v) => setTurnDelay(v[0])} min={0} max={10} step={0.5} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>0s instant</span><span>10s slow</span>
              </div>
            </div>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <div className="neural-section-label flex items-center justify-between">
              <span>// seed_message</span>
              {!isCustom && !seedEditing && (
                <button
                  onClick={() => setSeedEditing(true)}
                  className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                >
                  Customize &rarr;
                </button>
              )}
            </div>
            {seedEditing || isCustom ? (
              <Textarea
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                rows={6}
                className="resize-none font-mono text-xs"
                placeholder="Enter the opening message for the experiment..."
              />
            ) : (
              <div className="font-mono text-xs text-text-dim bg-bg-deep/80 rounded-sm p-3 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border-custom/50">
                {seed}
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <div className="neural-section-label flex items-center justify-between">
              <span>// system_prompt {isCustom && <span className="text-text-dim/40">(optional)</span>}</span>
              {!isCustom && !promptEditing && (
                <button
                  onClick={() => setPromptEditing(true)}
                  className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                >
                  Customize &rarr;
                </button>
              )}
            </div>
            {promptEditing || isCustom ? (
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                className="resize-none font-mono text-xs"
                placeholder={isCustom ? 'Leave empty to use the default system prompt...' : ''}
              />
            ) : (
              <div className="font-mono text-xs text-text-dim bg-bg-deep/80 rounded-sm p-3 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border-custom/50">
                {systemPrompt || <span className="text-text-dim/40 italic">default system prompt</span>}
              </div>
            )}
          </div>

          {/* Referee Config */}
          <div className="space-y-3">
            <div className="neural-section-label">// referee_config</div>

            <button
              type="button"
              onClick={() => { setEnableScoring(!enableScoring); if (enableScoring) setEnableVerdict(false) }}
              className="flex items-center gap-3 group w-full text-left"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${enableScoring ? 'bg-accent/70' : 'bg-border-custom'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableScoring ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                Enable per-turn scoring
              </span>
            </button>

            {enableScoring && (
              <div className="space-y-3 pl-4 border-l border-accent/20">
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                    Referee Model
                  </label>
                  <Select value={judgeModel} onValueChange={setJudgeModel}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue placeholder="Auto (gemini-2.5-flash)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="font-mono text-xs">Auto (gemini-2.5-flash)</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  type="button"
                  onClick={() => setEnableVerdict(!enableVerdict)}
                  className="flex items-center gap-3 group w-full text-left"
                >
                  <div className={`relative w-8 h-4 rounded-full transition-colors ${enableVerdict ? 'bg-accent/70' : 'bg-border-custom'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableVerdict ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                    Enable final verdict
                  </span>
                </button>
              </div>
            )}

            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              // scoring fires async &mdash; relay loop never pauses
            </p>
          </div>

          {/* Memory */}
          <div className="space-y-3">
            <div className="neural-section-label">// memory</div>

            <button
              type="button"
              onClick={() => setEnableMemory(!enableMemory)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${enableMemory ? 'bg-accent/70' : 'bg-border-custom'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableMemory ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                Enable memory
              </span>
            </button>

            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              // inject vocab from past sessions with this model pair
            </p>
          </div>

          {/* Observer / Narrator */}
          <div className="space-y-3">
            <div className="neural-section-label">// observer</div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Observer Model
              </label>
              <Select value={observerModel} onValueChange={setObserverModel}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="None (disabled)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="font-mono text-xs">None (disabled)</SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {observerModel && observerModel !== 'none' && (
              <div className="space-y-1.5 pl-4 border-l border-accent/20">
                <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                  Commentary every <span className="text-accent/60">[{observerInterval}]</span> turns
                </label>
                <Slider value={[observerInterval]} onValueChange={(v) => setObserverInterval(v[0])} min={1} max={10} step={1} />
                <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                  <span>1 every turn</span><span>10 every 10</span>
                </div>
              </div>
            )}

            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              // neutral model observes and comments every N turns
            </p>
          </div>

          {/* Error */}
          {formError && (
            <p className="font-mono text-xs text-danger">// {formError}</p>
          )}

          {/* Pre-launch estimate */}
          {(() => {
            const avgTurnSecs = 6
            const n = rpgMode ? 1 : agents.length
            const totalSecs = rounds * n * (avgTurnSecs + turnDelay)
            const mins = Math.floor(totalSecs / 60)
            const secs = Math.round(totalSecs % 60)
            const timeStr = mins > 0 ? `~${mins}m ${secs}s` : `~${secs}s`
            const tokenBudget = (rounds * n * maxTokens).toLocaleString()
            return (
              <div className="font-mono text-[10px] text-text-dim/50 flex gap-4 justify-center tracking-wider">
                <span><span className="text-accent/40">// est</span> {timeStr}</span>
                <span className="text-accent/25">&middot;</span>
                <span>&le;{tokenBudget} tokens</span>
                {!rpgMode && agents.length > 2 && (
                  <span className="text-accent/40">&middot; {agents.length} agents</span>
                )}
              </div>
            )
          })()}

          {/* Launch */}
          <Button
            onClick={handleLaunch}
            disabled={starting || !agents[0]?.model || (!rpgMode && agents.some(a => !a.model))}
            className="w-full bg-accent hover:bg-accent/90 font-display font-bold tracking-widest text-xs uppercase"
          >
            {starting ? '// Launching...' : rpgMode ? 'Begin Campaign' : 'Launch Experiment'}
          </Button>
        </div>
      </div>
    </div>
  )
}

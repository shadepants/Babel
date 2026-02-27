import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { api } from '@/api/client'
import type { Preset, ModelInfo, ModelStatusInfo, PersonaRecord, CampaignPreset } from '@/api/types'
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
import { PairingOracle } from '@/components/configure/PairingOracle'

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
  const location = useLocation()
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

  // -- Personas --
  const [personas, setPersonas] = useState<PersonaRecord[]>([])
  const [agentPersonaIds, setAgentPersonaIds] = useState<(string | null)[]>([null, null, null, null])

  // Preset defaults -- for divergence indicators + reset (null when custom)
  const [presetDefaults, setPresetDefaults] = useState<{ rounds: number; temperature: number; maxTokens: number } | null>(null)
  // Suggested model strings from preset (for C3 indicator)
  const [suggestedModels, setSuggestedModels] = useState<[string, string]>(['', ''])

  // -- Oracle panel --
  const [oracleOpen, setOracleOpen] = useState(false)

  // -- Session 27: Echo Chamber Detection --
  const [enableEchoDetector, setEnableEchoDetector] = useState(false)
  const [enableEchoIntervention, setEnableEchoIntervention] = useState(false)

  // -- Session 27: Adversarial Mode --
  const [hiddenGoals, setHiddenGoals] = useState<[string, string]>(['', ''])
  const [revelationRound, setRevelationRound] = useState<number | null>(null)

  // -- Session 27: Audit --
  const [enableAudit, setEnableAudit] = useState(false)

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

  // Load personas for dropdowns
  useEffect(() => {
    api.getPersonas().then(setPersonas).catch(() => {})
  }, [])

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

  // Oracle apply handler -- updates model A and model B slots
  const handleOracleApply = (modelA: string, modelB: string) => {
    setAgents(prev => prev.map((a, i) =>
      i === 0 ? { ...a, model: modelA } : i === 1 ? { ...a, model: modelB } : a
    ))
  }

  async function handleLaunch() {
    const activeModel = agents[0]?.model
    if (!activeModel || agents.some(a => !a.model)) {
      setFormError('Please select models for all agents.')
      return
    }
    if (!seed.trim()) {
      setFormError('Please enter a seed message.')
      return
    }

    setStarting(true)
    setFormError(null)

    try {
      // Build the agents array with display names for speaker identification
      const agentsPayload = agents.map((a) => ({
        model: a.model,
        temperature: a.temperature,
        name: models.find((m) => m.model === a.model)?.name ?? a.model.split('/').pop() ?? a.model,
      }))

      const request: Parameters<typeof api.startRelay>[0] = {
        // Phase 15-A: N-way agents path
        ...(agentsPayload ? { agents: agentsPayload } : {}),
        // Legacy fields kept for backward compat
        model_a: activeModel,
        model_b: agents[1]?.model ?? '',
        seed: seed.trim(),
        rounds,
        temperature_a: agents[0]?.temperature ?? 0.7,
        temperature_b: agents[1]?.temperature ?? 0.7,
        max_tokens: maxTokens,
        turn_delay_seconds: turnDelay,
        enable_scoring: enableScoring,
        enable_verdict: enableVerdict,
        enable_memory: enableMemory,
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
      // Phase 16: persona IDs
      const activePersonaIds = agentPersonaIds.slice(0, agents.length)
      if (activePersonaIds.some(Boolean)) {
        request.persona_ids = activePersonaIds
      }
      // Session 27: Echo Chamber Detection
      if (enableEchoDetector) {
        (request as Record<string, unknown>).enable_echo_detector = true
        if (enableEchoIntervention) {
          (request as Record<string, unknown>).enable_echo_intervention = true
        }
      }
      // Session 27: Adversarial hidden goals
      const activeGoals = hiddenGoals.filter(g => g.trim())
      if (activeGoals.length === 2) {
        (request as Record<string, unknown>).hidden_goals = [
          { agent_index: 0, goal: hiddenGoals[0].trim() },
          { agent_index: 1, goal: hiddenGoals[1].trim() },
        ]
        if (revelationRound) {
          (request as Record<string, unknown>).revelation_round = revelationRound
        }
      }
      // Session 27: Audit
      if (enableAudit) {
        (request as Record<string, unknown>).enable_audit = true
      }

      const res = await api.startRelay(request)

      navigate(`/theater/${res.match_id}`, {
        state: {
          modelAName: agentsPayload?.[0]?.name ?? agents[0]?.model ?? '',
          modelBName: agentsPayload?.[1]?.name ?? agents[1]?.model ?? '',
        },
      })
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

          {/* Models -- N-way agent slots */}
          <div className="space-y-3">
            <div className="neural-section-label flex items-center justify-between">
              <span>// model_selection</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={swapAB}
                  className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                  title="Swap Model A and Model B"
                >
                  &#8646; swap A&#8596;B
                </button>
                {agents.length < 4 && (
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
              {agents.map((agent, idx) => {
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
                      {agents.length > 2 && (
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
                      <p className="font-mono text-[9px] text-text-dim/40 tracking-wider mt-0.5">// controls randomness -- higher values produce more surprising responses</p>
                    </div>
                    {/* Per-agent persona (Phase 16) */}
                    {personas.length > 0 && (
                      <div className="pt-1">
                        <label className="font-mono text-[9px] tracking-wider uppercase block mb-1" style={{ color: agentColor + 'aa' }}>
                          Persona
                        </label>
                        <select
                          value={agentPersonaIds[idx] ?? ''}
                          onChange={(e) => setAgentPersonaIds(prev => {
                            const next = [...prev]
                            next[idx] = e.target.value || null
                            return next
                          })}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-accent/40 rounded px-2 py-1 font-mono text-[10px] text-text-primary outline-none transition-colors"
                        >
                          <option value="">(none)</option>
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Oracle Suggestions -- only shown when exactly 2 agents */}
          {agents.length === 2 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setOracleOpen(prev => !prev)}
                className="neural-section-label flex items-center justify-between w-full text-left hover:text-accent/80 transition-colors"
              >
                <span>// oracle_suggestions</span>
                <span className="font-mono text-[9px] text-accent/40 tracking-wider">
                  {oracleOpen ? '&#9650; hide' : '&#9660; show'}
                </span>
              </button>

              {oracleOpen && (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                    // ranked pairings from past chemistry data &mdash; click Apply to load
                  </p>
                  <PairingOracle
                    preset={preset?.id ?? null}
                    onApply={handleOracleApply}
                  />
                </div>
              )}
            </div>
          )}

          {/* RPG Participants */}
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
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider mt-0.5">// total back-and-forth exchanges before the session ends</p>
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
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider mt-0.5">// response length ceiling per turn</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Turn Delay <span className="text-accent/60">[{turnDelay.toFixed(1)}s]</span>
              </label>
              <Slider value={[turnDelay]} onValueChange={(v) => setTurnDelay(v[0])} min={0} max={10} step={0.5} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>0s instant</span><span>10s slow</span>
              </div>
              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider mt-0.5">// pause between turns -- useful for reading along in real time</p>
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
              // an AI judge scores each turn on creativity, coherence, and novelty -- never interrupts the flow
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
              // injects vocabulary patterns from past sessions with this model pair into the system prompt
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
              // a silent third model injects commentary every N turns without participating
            </p>
          </div>

          {/* Echo Chamber Detection */}
          <div className="space-y-3">
            <div className="neural-section-label">// echo_detection</div>

            <button
              type="button"
              onClick={() => setEnableEchoDetector(!enableEchoDetector)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${enableEchoDetector ? 'bg-amber-500/70' : 'bg-border-custom'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableEchoDetector ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                Convergence monitor
              </span>
            </button>

            {enableEchoDetector && (
              <div className="space-y-3 pl-4 border-l border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setEnableEchoIntervention(!enableEchoIntervention)}
                  className="flex items-center gap-3 group w-full text-left"
                >
                  <div className={`relative w-8 h-4 rounded-full transition-colors ${enableEchoIntervention ? 'bg-amber-500/70' : 'bg-border-custom'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableEchoIntervention ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                    Auto-intervene at critical convergence
                  </span>
                </button>
              </div>
            )}

            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              // real-time Jaccard similarity monitoring &mdash; warns when models converge too much
            </p>
          </div>

          {/* Adversarial Mode */}
          {agents.length === 2 && (
            <div className="space-y-3">
              <div className="neural-section-label">// adversarial_mode</div>

              {[0, 1].map((idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                    Hidden Agenda &mdash; Agent {idx + 1}
                  </label>
                  <Textarea
                    value={hiddenGoals[idx]}
                    onChange={(e) => {
                      const next = [...hiddenGoals] as [string, string]
                      next[idx] = e.target.value
                      setHiddenGoals(next)
                    }}
                    placeholder={`Secret goal only Agent ${idx + 1} will see...`}
                    className="font-mono text-xs min-h-[60px]"
                  />
                </div>
              ))}

              {hiddenGoals.some(g => g.trim()) && (
                <div className="space-y-1.5 pl-4 border-l border-violet-500/20">
                  <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                    Revelation round (blank = reveal at end)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={rounds}
                    value={revelationRound ?? ''}
                    onChange={(e) => setRevelationRound(e.target.value ? Number(e.target.value) : null)}
                    className="font-mono text-xs bg-bg-deep border border-border-custom rounded px-2 py-1 w-20"
                    placeholder="End"
                  />
                </div>
              )}

              <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
                // each agent gets a secret goal &mdash; agendas revealed at end for dramatic re-reading
              </p>
            </div>
          )}

          {/* Audit */}
          <div className="space-y-3">
            <div className="neural-section-label">// audit</div>

            <button
              type="button"
              onClick={() => setEnableAudit(!enableAudit)}
              className="flex items-center gap-3 group w-full text-left"
            >
              <div className={`relative w-8 h-4 rounded-full transition-colors ${enableAudit ? 'bg-violet-500/70' : 'bg-border-custom'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform bg-white/90 ${enableAudit ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="font-mono text-[10px] text-text-dim tracking-wider uppercase group-hover:text-text-primary transition-colors">
                Recursive audit
              </span>
            </button>

            <p className="font-mono text-[9px] text-text-dim/40 tracking-wider">
              // two AI analysts automatically review this experiment when it ends &mdash; the audit is itself an experiment
            </p>
          </div>

          {/* Error */}
          {formError && (
            <p className="font-mono text-xs text-danger">// {formError}</p>
          )}

          {/* Pre-launch estimate */}
          {(() => {
            const avgTurnSecs = 6
            const n = agents.length
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
                {agents.length > 2 && (
                  <span className="text-accent/40">&middot; {agents.length} agents</span>
                )}
              </div>
            )
          })()}

          {/* Launch */}
          <Button
            onClick={handleLaunch}
            disabled={starting || agents.some(a => !a.model)}
            className="w-full bg-accent hover:bg-accent/90 font-display font-bold tracking-widest text-xs uppercase"
          >
            {starting ? '// Launching...' : 'Launch Experiment'}
          </Button>
        </div>
      </div>
    </div>
  )
}

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

export default function Configure() {
  const { presetId } = useParams<{ presetId: string }>()
  const navigate = useNavigate()
  const isCustom = presetId === 'custom'
  const [searchParams] = useSearchParams()
  const remixId = searchParams.get('remix')
  const formAccentColor = isCustom ? null : getPresetGlow(presetId)

  // -- Data loading --
  const [preset, setPreset] = useState<Preset | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelStatus, setModelStatus] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // -- Form state --
  const [modelA, setModelA] = useState('')
  const [modelB, setModelB] = useState('')
  const [rounds, setRounds] = useState(5)
  const [temperatureA, setTemperatureA] = useState(0.7)
  const [temperatureB, setTemperatureB] = useState(0.7)
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

  // Preset defaults — for divergence indicators + reset (null when custom)
  const [presetDefaults, setPresetDefaults] = useState<{ rounds: number; temperatureA: number; temperatureB: number; maxTokens: number } | null>(null)
  // Suggested model strings from preset (for C3 indicator)
  const [suggestedModelA, setSuggestedModelA] = useState('')
  const [suggestedModelB, setSuggestedModelB] = useState('')

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
            setModelA(modelsRes.models[0].model)
            setModelB(modelsRes.models[1].model)
          }
          // Apply user's saved defaults for the custom path
          const prefs = getPrefs()
          setRounds(prefs.defaultRounds)
          setTemperatureA(prefs.defaultTemperature)
          setTemperatureB(prefs.defaultTemperature)
          setMaxTokens(prefs.defaultMaxTokens)
          setTurnDelay(prefs.defaultTurnDelay)
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
          setTemperatureA(found.defaults.temperature)
          setTemperatureB(found.defaults.temperature)
          setMaxTokens(found.defaults.max_tokens)
          // Store for divergence tracking (C1/C2)
          setPresetDefaults({
            rounds: found.defaults.rounds,
            temperatureA: found.defaults.temperature,
            temperatureB: found.defaults.temperature,
            maxTokens: found.defaults.max_tokens,
          })

          const sugA = modelsRes.models.find((m) => m.name === found.suggested_models.a)
          const sugB = modelsRes.models.find((m) => m.name === found.suggested_models.b)
          const resolvedA = sugA?.model ?? modelsRes.models[0]?.model ?? ''
          const resolvedB = sugB?.model ?? modelsRes.models[1]?.model ?? ''
          setModelA(resolvedA)
          setModelB(resolvedB)
          // Store for C3 "preset suggestion" label
          setSuggestedModelA(resolvedA)
          setSuggestedModelB(resolvedB)
        }

        // Remix: if ?remix=<id> is set, pre-fill models/temps/seed from that experiment
        if (remixId) {
          try {
            const remixExp = await api.getExperiment(remixId)
            setModelA(remixExp.model_a)
            setModelB(remixExp.model_b)
            if (remixExp.temperature_a != null) setTemperatureA(remixExp.temperature_a)
            if (remixExp.temperature_b != null) setTemperatureB(remixExp.temperature_b)
            if (remixExp.seed) { setSeed(remixExp.seed); setSeedEditing(true) }
          } catch {
            // remix experiment not found — continue with preset defaults
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [presetId, isCustom, remixId])

  // Whether any parameter slider has been moved from the preset default
  const hasParamChanges = presetDefaults !== null && (
    rounds !== presetDefaults.rounds ||
    temperatureA !== presetDefaults.temperatureA ||
    temperatureB !== presetDefaults.temperatureB ||
    maxTokens !== presetDefaults.maxTokens
  )

  function handleResetParams() {
    if (!presetDefaults) return
    setRounds(presetDefaults.rounds)
    setTemperatureA(presetDefaults.temperatureA)
    setTemperatureB(presetDefaults.temperatureB)
    setMaxTokens(presetDefaults.maxTokens)
  }

  async function handleLaunch() {
    if (!modelA || !modelB) {
      setFormError('Please select both models.')
      return
    }
    if (!seed.trim()) {
      setFormError('Please enter a seed message.')
      return
    }

    setStarting(true)
    setFormError(null)

    try {
      const request: Parameters<typeof api.startRelay>[0] = {
        model_a: modelA,
        model_b: modelB,
        seed: seed.trim(),
        rounds,
        temperature_a: temperatureA,
        temperature_b: temperatureB,
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
      if (systemPrompt.trim()) {
        request.system_prompt = systemPrompt.trim()
      }

      const res = await api.startRelay(request)

      const nameA = models.find((m) => m.model === modelA)?.name ?? modelA
      const nameB = models.find((m) => m.model === modelB)?.name ?? modelB
      navigate(`/theater/${res.match_id}`, {
        state: { modelAName: nameA, modelBName: nameB },
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
          {/* Geometric symbol — replaces emoji */}
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

        {/* Tags */}
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

      {/* Configuration Form */}
      <div
        className="neural-card"
        style={formAccentColor ? { borderTop: '2px solid ' + formAccentColor.replace(/,\s*[\d.]+\)$/, ', 0.70)') } : undefined}
      >
        <div className="neural-card-bar" />
        <div className="p-6 space-y-6">

          {/* Models */}
          <div className="space-y-3">
            <div className="neural-section-label flex items-center justify-between">
              <span>// model_selection</span>
              <button
                type="button"
                onClick={() => {
                  const tmpModel = modelA; setModelA(modelB); setModelB(tmpModel)
                  const tmpTemp = temperatureA; setTemperatureA(temperatureB); setTemperatureB(tmpTemp)
                }}
                className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
                title="Swap Model A and Model B"
              >
                &#8646; swap
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-model-a tracking-wider uppercase block">
                  &#9671; Model A
                </label>
                <Select value={modelA} onValueChange={setModelA}>
                  <SelectTrigger className="font-mono text-xs border-model-a/30 focus:ring-model-a/40">
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
                {modelA && modelStatus.get(modelA) === false && (
                  <p className="font-mono text-[9px] text-danger/80 tracking-wider">// api key not configured</p>
                )}
                {!isCustom && suggestedModelA && modelA === suggestedModelA && (
                  <p className="font-mono text-[9px] text-accent/45 tracking-wider">// preset suggestion</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-model-b tracking-wider uppercase block">
                  &#9671; Model B
                </label>
                <Select value={modelB} onValueChange={setModelB}>
                  <SelectTrigger className="font-mono text-xs border-model-b/30 focus:ring-model-b/40">
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
                {modelB && modelStatus.get(modelB) === false && (
                  <p className="font-mono text-[9px] text-danger/80 tracking-wider">// api key not configured</p>
                )}
                {!isCustom && suggestedModelB && modelB === suggestedModelB && (
                  <p className="font-mono text-[9px] text-accent/45 tracking-wider">// preset suggestion</p>
                )}
              </div>
            </div>
          </div>

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
                  ↺ reset
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Rounds <span className="text-accent/60">[{rounds}]</span>
                {presetDefaults && rounds !== presetDefaults.rounds && (
                  <span className="ml-1.5 text-model-a/70" title="modified from preset default">●</span>
                )}
              </label>
              <Slider value={[rounds]} onValueChange={(v) => setRounds(v[0])} min={1} max={15} step={1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>1</span><span>15</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-model-a tracking-wider uppercase block">
                Temp A <span className="text-accent/60">[{temperatureA.toFixed(1)}]</span>
                {presetDefaults && temperatureA !== presetDefaults.temperatureA && (
                  <span className="ml-1.5 text-model-a/70" title="modified from preset default">●</span>
                )}
              </label>
              <Slider value={[temperatureA]} onValueChange={(v) => setTemperatureA(v[0])} min={0} max={2} step={0.1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>0 precise</span><span>2 creative</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-model-b tracking-wider uppercase block">
                Temp B <span className="text-accent/60">[{temperatureB.toFixed(1)}]</span>
                {presetDefaults && temperatureB !== presetDefaults.temperatureB && (
                  <span className="ml-1.5 text-model-b/70" title="modified from preset default">●</span>
                )}
              </label>
              <Slider value={[temperatureB]} onValueChange={(v) => setTemperatureB(v[0])} min={0} max={2} step={0.1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>0 precise</span><span>2 creative</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Max Tokens <span className="text-accent/60">[{maxTokens}]</span>
                {presetDefaults && maxTokens !== presetDefaults.maxTokens && (
                  <span className="ml-1.5 text-model-a/70" title="modified from preset default">●</span>
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
                  Customize &#8594;
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
                  Customize &#8594;
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
            const totalSecs = rounds * 2 * (avgTurnSecs + turnDelay)
            const mins = Math.floor(totalSecs / 60)
            const secs = Math.round(totalSecs % 60)
            const timeStr = mins > 0 ? `~${mins}m ${secs}s` : `~${secs}s`
            const tokenBudget = (rounds * 2 * maxTokens).toLocaleString()
            return (
              <div className="font-mono text-[10px] text-text-dim/50 flex gap-4 justify-center tracking-wider">
                <span><span className="text-accent/40">// est</span> {timeStr}</span>
                <span className="text-accent/25">&middot;</span>
                <span>&le;{tokenBudget} tokens</span>
              </div>
            )
          })()}

          {/* Launch */}
          <Button
            onClick={handleLaunch}
            disabled={starting || !modelA || !modelB}
            className="w-full bg-accent hover:bg-accent/90 font-display font-bold tracking-widest text-xs uppercase"
          >
            {starting ? '// Launching...' : 'Launch Experiment'}
          </Button>
        </div>
      </div>
    </div>
  )
}

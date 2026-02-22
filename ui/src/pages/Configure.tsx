import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { Preset, ModelInfo } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Map emoji to sci-fi geometric symbols */
const SYMBOL_MAP: Record<string, string> = {
  '🧠': '◈', '⚙️': '⊕', '🎭': '✦', '📊': '⬡', '🌱': '◉',
  '🤝': '⟡', '🔬': '⌬', '💡': '◇', '🎯': '⊗', '🤖': '⧖',
  '🌍': '◉', '⚖️': '⊗', '🎪': '✦', '🔮': '◈', '🗺️': '⬡',
  '🌐': '⬡', '🧬': '◈', '⚡': '⊕', '🌊': '◉', '🔥': '✦',
}

function getSymbol(emoji: string): string {
  return SYMBOL_MAP[emoji] ?? '◈'
}

export default function Configure() {
  const { presetId } = useParams<{ presetId: string }>()
  const navigate = useNavigate()
  const isCustom = presetId === 'custom'

  // ── Data loading ──
  const [preset, setPreset] = useState<Preset | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Form state ──
  const [modelA, setModelA] = useState('')
  const [modelB, setModelB] = useState('')
  const [rounds, setRounds] = useState(5)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1500)
  const [seed, setSeed] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [seedEditing, setSeedEditing] = useState(false)
  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load models + preset data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [modelsRes, presetsRes] = await Promise.all([
          api.getModels(),
          isCustom ? Promise.resolve(null) : api.getPresets(),
        ])

        setModels(modelsRes.models)

        if (isCustom) {
          if (modelsRes.models.length >= 2) {
            setModelA(modelsRes.models[0].model)
            setModelB(modelsRes.models[1].model)
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
          setTemperature(found.defaults.temperature)
          setMaxTokens(found.defaults.max_tokens)

          const sugA = modelsRes.models.find((m) => m.name === found.suggested_models.a)
          const sugB = modelsRes.models.find((m) => m.name === found.suggested_models.b)
          setModelA(sugA?.model ?? modelsRes.models[0]?.model ?? '')
          setModelB(sugB?.model ?? modelsRes.models[1]?.model ?? '')
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [presetId, isCustom])

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
        temperature,
        max_tokens: maxTokens,
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
            ← Back to Seed Lab
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
          ← Seed Lab
        </Link>

        <div className="mt-4 flex items-center gap-4">
          {/* Geometric symbol — replaces emoji */}
          {preset && (
            <span className="font-display text-3xl text-accent/50 leading-none select-none">
              {getSymbol(preset.emoji)}
            </span>
          )}
          {isCustom && (
            <span className="font-display text-3xl text-accent/35 leading-none select-none">✦</span>
          )}
          <div>
            <h1 className="font-display font-black tracking-widest text-2xl text-text-primary">
              {isCustom ? 'Custom' : preset?.name}
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
      <div className="neural-card">
        <div className="neural-card-bar" />
        <div className="p-6 space-y-6">

          {/* Models */}
          <div className="space-y-3">
            <div className="neural-section-label">// model_selection</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-model-a tracking-wider uppercase block">
                  ◈ Model A
                </label>
                <Select value={modelA} onValueChange={setModelA}>
                  <SelectTrigger className="font-mono text-xs border-model-a/30 focus:ring-model-a/40">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.model} value={m.model} className="font-mono text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-model-b tracking-wider uppercase block">
                  ◈ Model B
                </label>
                <Select value={modelB} onValueChange={setModelB}>
                  <SelectTrigger className="font-mono text-xs border-model-b/30 focus:ring-model-b/40">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.model} value={m.model} className="font-mono text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-4">
            <div className="neural-section-label">// parameters</div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Rounds <span className="text-accent/60">[{rounds}]</span>
              </label>
              <Slider value={[rounds]} onValueChange={(v) => setRounds(v[0])} min={1} max={15} step={1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>1</span><span>15</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Temperature <span className="text-accent/60">[{temperature.toFixed(1)}]</span>
              </label>
              <Slider value={[temperature]} onValueChange={(v) => setTemperature(v[0])} min={0} max={2} step={0.1} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>0 precise</span><span>2 creative</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Max Tokens <span className="text-accent/60">[{maxTokens}]</span>
              </label>
              <Slider value={[maxTokens]} onValueChange={(v) => setMaxTokens(v[0])} min={100} max={4096} step={100} />
              <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                <span>100</span><span>4096</span>
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
                  Customize →
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
            <div className="neural-section-label">
              // system_prompt {isCustom && <span className="text-text-dim/40">(optional)</span>}
            </div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="resize-none font-mono text-xs"
              placeholder={isCustom ? 'Leave empty to use the default system prompt...' : ''}
            />
          </div>

          {/* Error */}
          {formError && (
            <p className="font-mono text-xs text-danger">// {formError}</p>
          )}

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

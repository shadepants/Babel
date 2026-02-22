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
import { Badge } from '@/components/ui/badge'

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
          // Custom mode — set reasonable defaults
          if (modelsRes.models.length >= 2) {
            setModelA(modelsRes.models[0].model)
            setModelB(modelsRes.models[1].model)
          }
          setSeedEditing(true) // always editable in custom mode
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

          // Match suggested models to registry
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
      // Build request — omit system_prompt if empty (let server use default)
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

      // Navigate to Theater with model names for the header
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
        <p className="text-text-dim animate-pulse-slow">Loading...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-danger">{loadError}</p>
          <Link to="/" className="text-accent hover:underline text-sm">
            Back to Seed Lab
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/" className="text-sm text-text-dim hover:text-accent transition-colors">
          &larr; Seed Lab
        </Link>
        <div className="mt-3 flex items-center gap-3">
          {preset && <span className="text-3xl">{preset.emoji}</span>}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isCustom ? 'Custom Experiment' : preset?.name}
            </h1>
            {preset && (
              <p className="text-sm text-text-dim mt-0.5">{preset.description}</p>
            )}
          </div>
        </div>
        {preset && (
          <div className="flex gap-1.5 mt-2">
            {preset.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="space-y-5 bg-bg-card border border-border-custom rounded-lg p-6">
        {/* Models Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-model-a">Model A</label>
            <Select value={modelA} onValueChange={setModelA}>
              <SelectTrigger>
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.model} value={m.model}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-model-b">Model B</label>
            <Select value={modelB} onValueChange={setModelB}>
              <SelectTrigger>
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.model} value={m.model}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rounds */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Rounds: {rounds}
          </label>
          <Slider
            value={[rounds]}
            onValueChange={(v) => setRounds(v[0])}
            min={1}
            max={15}
            step={1}
          />
          <div className="flex justify-between text-xs text-text-dim">
            <span>1</span>
            <span>15</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Temperature: {temperature.toFixed(1)}
          </label>
          <Slider
            value={[temperature]}
            onValueChange={(v) => setTemperature(v[0])}
            min={0}
            max={2}
            step={0.1}
          />
          <div className="flex justify-between text-xs text-text-dim">
            <span>0 (precise)</span>
            <span>2 (creative)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Max Tokens: {maxTokens}
          </label>
          <Slider
            value={[maxTokens]}
            onValueChange={(v) => setMaxTokens(v[0])}
            min={100}
            max={4096}
            step={100}
          />
          <div className="flex justify-between text-xs text-text-dim">
            <span>100</span>
            <span>4096</span>
          </div>
        </div>

        {/* Seed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Seed Message</label>
            {!isCustom && !seedEditing && (
              <button
                onClick={() => setSeedEditing(true)}
                className="text-xs text-accent hover:underline"
              >
                Customize
              </button>
            )}
          </div>
          {seedEditing || isCustom ? (
            <Textarea
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Enter the opening message for the experiment..."
            />
          ) : (
            <div className="text-sm text-text-dim bg-bg-deep rounded-md p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {seed}
            </div>
          )}
        </div>

        {/* System Prompt (always editable) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            System Prompt {isCustom && <span className="text-text-dim font-normal">(optional)</span>}
          </label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="resize-none"
            placeholder={isCustom ? 'Leave empty to use the default system prompt...' : ''}
          />
        </div>

        {/* Error */}
        {formError && (
          <p className="text-sm text-danger">{formError}</p>
        )}

        {/* Launch */}
        <Button
          onClick={handleLaunch}
          disabled={starting || !modelA || !modelB}
          className="w-full bg-accent hover:bg-accent/90"
        >
          {starting ? 'Launching...' : 'Launch Experiment'}
        </Button>
      </div>
    </div>
  )
}

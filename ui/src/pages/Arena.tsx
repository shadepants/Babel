import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { ModelInfo, Preset } from '@/api/types'
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

/**
 * Arena page — tournament setup with multi-model selection.
 * Pick 3+ models, a preset, and launch a round-robin tournament.
 */
export default function Arena() {
  const navigate = useNavigate()

  // ── Data loading ──
  const [models, setModels] = useState<ModelInfo[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)

  // ── Form state ──
  const [name, setName] = useState('')
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState<string>('')
  const [rounds, setRounds] = useState(3)
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1500)
  const [seed, setSeed] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [modelsRes, presetsRes] = await Promise.all([
          api.getModels(),
          api.getPresets(),
        ])
        setModels(modelsRes.models)
        setPresets(presetsRes.presets)
      } catch {
        // Non-critical — form still usable
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // When preset changes, update seed/system prompt
  function handlePresetChange(id: string) {
    setPresetId(id)
    if (id) {
      const p = presets.find((p) => p.id === id)
      if (p) {
        setSeed(p.seed)
        setSystemPrompt(p.system_prompt)
        setRounds(Math.min(p.defaults.rounds, 15))
        setTemperature(p.defaults.temperature)
        setMaxTokens(p.defaults.max_tokens)
        if (!name) setName(`${p.name} Tournament`)
      }
    }
  }

  function toggleModel(modelStr: string) {
    setSelectedModels((prev) => {
      const next = new Set(prev)
      if (next.has(modelStr)) {
        next.delete(modelStr)
      } else {
        next.add(modelStr)
      }
      return next
    })
  }

  const pairingCount = selectedModels.size * (selectedModels.size - 1) / 2

  async function handleLaunch() {
    if (!name.trim()) {
      setFormError('Please enter a tournament name.')
      return
    }
    if (selectedModels.size < 3) {
      setFormError('Select at least 3 models.')
      return
    }
    if (!seed.trim()) {
      setFormError('Select a preset or enter a seed message.')
      return
    }

    setStarting(true)
    setFormError(null)

    try {
      const res = await api.startTournament({
        name: name.trim(),
        models: Array.from(selectedModels),
        preset: presetId || undefined,
        seed: seed.trim(),
        system_prompt: systemPrompt.trim(),
        rounds,
        temperature,
        max_tokens: maxTokens,
      })
      navigate(`/tournament/${res.tournament_id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start tournament')
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

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/" className="text-sm text-text-dim hover:text-accent transition-colors">
          &larr; Seed Lab
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-3">Arena</h1>
        <p className="text-sm text-text-dim mt-1">
          Run a round-robin tournament across multiple models. Same preset, every pairing.
        </p>
      </div>

      <div className="space-y-5 bg-bg-card border border-border-custom rounded-lg p-6">
        {/* Tournament Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Tournament Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Battle of the Bots"
            className="w-full px-3 py-2 bg-bg-deep border border-border-custom rounded-md text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Preset */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Preset</label>
          <Select value={presetId} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Multi-Select */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Models
            <span className="ml-2 font-normal text-text-dim">
              ({selectedModels.size} selected
              {selectedModels.size >= 2 && ` \u2014 ${pairingCount} matches`})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {models.map((m) => {
              const selected = selectedModels.has(m.model)
              return (
                <button
                  key={m.model}
                  type="button"
                  onClick={() => toggleModel(m.model)}
                  className={`px-3 py-2 rounded-md border text-sm text-left transition-colors ${
                    selected
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-bg-deep border-border-custom text-text-dim hover:border-accent/50'
                  }`}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
          {selectedModels.size > 0 && selectedModels.size < 3 && (
            <p className="text-xs text-warning">Select at least 3 models for a tournament.</p>
          )}
        </div>

        {/* Rounds */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Rounds per match: {rounds}
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
        </div>

        {/* Seed (read-only from preset, or editable if no preset) */}
        {seed && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Seed Message</label>
            {presetId ? (
              <div className="text-sm text-text-dim bg-bg-deep rounded-md p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {seed}
              </div>
            ) : (
              <Textarea
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                rows={4}
                className="resize-none"
                placeholder="Enter the opening message..."
              />
            )}
          </div>
        )}

        {/* System Prompt */}
        {systemPrompt && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">System Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        {/* Pairing Preview */}
        {selectedModels.size >= 3 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Match Pairings</label>
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const modelArr = Array.from(selectedModels)
                const pairs: [string, string][] = []
                for (let i = 0; i < modelArr.length; i++) {
                  for (let j = i + 1; j < modelArr.length; j++) {
                    pairs.push([modelArr[i], modelArr[j]])
                  }
                }
                return pairs.map(([a, b]) => {
                  const nameA = models.find((m) => m.model === a)?.name ?? a.split('/').pop()
                  const nameB = models.find((m) => m.model === b)?.name ?? b.split('/').pop()
                  return (
                    <Badge key={`${a}-${b}`} variant="secondary" className="text-xs">
                      {nameA} vs {nameB}
                    </Badge>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Error */}
        {formError && (
          <p className="text-sm text-danger">{formError}</p>
        )}

        {/* Launch */}
        <Button
          onClick={handleLaunch}
          disabled={starting || selectedModels.size < 3 || !name.trim() || !seed.trim()}
          className="w-full bg-accent hover:bg-accent/90"
        >
          {starting
            ? 'Launching...'
            : `Launch Tournament (${pairingCount} matches)`
          }
        </Button>
      </div>
    </div>
  )
}

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
import { ScrambleText } from '@/components/common/ScrambleText'

/**
 * Arena page — tournament setup with multi-model selection.
 * Pick 3+ models, a preset, and launch a round-robin tournament.
 */
export default function Arena() {
  const navigate = useNavigate()

  const [models, setModels] = useState<ModelInfo[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)

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
      if (next.has(modelStr)) next.delete(modelStr)
      else next.add(modelStr)
      return next
    })
  }

  const pairingCount = selectedModels.size * (selectedModels.size - 1) / 2

  async function handleLaunch() {
    if (!name.trim()) { setFormError('Please enter a tournament name.'); return }
    if (selectedModels.size < 3) { setFormError('Select at least 3 models.'); return }
    if (!seed.trim()) { setFormError('Select a preset or enter a seed message.'); return }

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
        <p className="font-mono text-[10px] text-text-dim animate-pulse-slow tracking-widest uppercase">initializing...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-4">
          <Link to="/" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
            &larr; Seed Lab
          </Link>
          <Link to="/tournaments" className="font-mono text-[10px] text-text-dim hover:text-accent transition-colors tracking-widest uppercase">
            Past Tournaments &rarr;
          </Link>
        </div>
        <h1 className="font-display font-black tracking-widest text-2xl text-text-primary mt-3">
          <ScrambleText>Arena</ScrambleText>
        </h1>
        <p className="font-mono text-xs text-text-dim mt-1 tracking-wider">
          <span className="text-accent/60">// </span>round-robin tournament &mdash; same preset, every pairing
        </p>
      </div>

      <div className="neural-card">
        <div className="neural-card-bar" />
        <div className="p-6 space-y-6">

          <div className="space-y-2">
            <div className="neural-section-label">// tournament_identity</div>
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Battle of the Bots"
              className="w-full px-3 py-2 bg-bg-deep/80 border border-border-custom rounded-sm text-text-primary text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-text-dim/40"
            />
          </div>

          <div className="space-y-2">
            <div className="neural-section-label">// experiment_protocol</div>
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">Preset</label>
            <Select value={presetId} onValueChange={handlePresetChange}>
              <SelectTrigger className="font-mono text-sm">
                <SelectValue placeholder="Choose a preset..." />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="font-mono">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="neural-section-label">// model_selection</div>
            <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
              Models
              <span className="ml-2 text-accent/60">
                [{selectedModels.size} selected
                {selectedModels.size >= 2 && ` · ${pairingCount} matches`}]
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
                    className={`px-3 py-2 rounded-sm border font-mono text-xs text-left transition-colors ${
                      selected
                        ? 'bg-accent/15 border-accent/60 text-accent'
                        : 'bg-bg-deep/60 border-border-custom text-text-dim hover:border-accent/35 hover:text-text-primary'
                    }`}
                  >
                    {m.name}
                  </button>
                )
              })}
            </div>
            {selectedModels.size > 0 && selectedModels.size < 3 && (
              <p className="font-mono text-[10px] text-warning tracking-wider">// select at least 3 models</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="neural-section-label">// parameters</div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] text-text-dim/70 tracking-wider uppercase block">
                Rounds per match <span className="text-accent/60">[{rounds}]</span>
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
            </div>
          </div>

          <div className="space-y-2">
            <div className="neural-section-label">// seed_message</div>
            {presetId ? (
              <div className="font-mono text-xs text-text-dim bg-bg-deep/80 rounded-sm p-3 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border-custom/50">
                {seed}
              </div>
            ) : (
              <Textarea
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                rows={4}
                className="resize-none font-mono text-sm"
                placeholder="Enter the opening message..."
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="neural-section-label">// system_prompt</div>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              className="resize-none font-mono text-sm"
              placeholder="Enter a system prompt for both models..."
            />
          </div>

          {selectedModels.size >= 3 && (
            <div className="space-y-2">
              <div className="neural-section-label">// match_pairings</div>
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
                      <span key={`${a}-${b}`} className="font-mono text-[10px] text-accent/60 border border-accent/20 px-1.5 py-0.5 rounded-sm">
                        {nameA} &#8652; {nameB}
                      </span>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {formError && (
            <p className="font-mono text-xs text-danger">// {formError}</p>
          )}

          <Button
            onClick={handleLaunch}
            disabled={starting || selectedModels.size < 3 || !name.trim() || !seed.trim()}
            className="w-full bg-accent hover:bg-accent/90 font-display font-bold tracking-widest text-xs uppercase"
          >
            {starting ? '// Launching...' : `Launch Tournament (${pairingCount} matches)`}
          </Button>
        </div>
      </div>
    </div>
  )
}

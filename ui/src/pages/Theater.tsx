import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import type { ModelInfo } from '@/api/types'
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
import { ConversationColumn } from '@/components/theater/ConversationColumn'
import { ExperimentHeader } from '@/components/theater/ExperimentHeader'
import { VocabPanel } from '@/components/theater/VocabPanel'

/** Default seed from server/config.py */
const DEFAULT_SEED =
  `I propose we build a shared symbolic language. Here are our first three words:
- ZYLOK = hello / goodbye
- KRAVT = yes / agreed
- KLAMA = understood

Please extend this vocabulary. Add new words, propose grammar rules, and start using the language.`

export default function Theater() {
  // ── Models list (loaded once) ──
  const [models, setModels] = useState<ModelInfo[]>([])
  useEffect(() => {
    api.getModels().then((res) => setModels(res.models)).catch(console.error)
  }, [])

  // ── Form state ──
  const [modelA, setModelA] = useState('')
  const [modelB, setModelB] = useState('')
  const [seed, setSeed] = useState(DEFAULT_SEED)
  const [rounds, setRounds] = useState(5)
  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── Experiment state ──
  const [matchId, setMatchId] = useState<string | null>(null)
  const [modelAName, setModelAName] = useState('')
  const [modelBName, setModelBName] = useState('')

  // ── SSE + derived state ──
  const { events, connected, error: sseError, clearEvents } = useSSE(matchId)
  const experiment = useExperimentState(events)

  // Auto-select first two models when list loads
  useEffect(() => {
    if (models.length >= 2 && !modelA && !modelB) {
      setModelA(models[0].model)
      setModelB(models[1].model)
    }
  }, [models, modelA, modelB])

  async function handleStart() {
    if (!modelA || !modelB || !seed.trim()) {
      setFormError('Please select both models and enter a seed message.')
      return
    }

    setStarting(true)
    setFormError(null)
    clearEvents()

    try {
      const res = await api.startRelay({
        model_a: modelA,
        model_b: modelB,
        seed: seed.trim(),
        rounds,
        temperature: 0.7,
        max_tokens: 1500,
      })

      // Look up display names for the header
      const nameA = models.find((m) => m.model === modelA)?.name ?? modelA
      const nameB = models.find((m) => m.model === modelB)?.name ?? modelB
      setModelAName(nameA)
      setModelBName(nameB)
      setMatchId(res.match_id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to start experiment')
    } finally {
      setStarting(false)
    }
  }

  function handleNewExperiment() {
    setMatchId(null)
    clearEvents()
  }

  // ── Render: Setup Form ──
  if (!matchId) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-text-primary">Babel</h1>
            <p className="text-text-dim">Watch two AI models invent a language together</p>
          </div>

          <div className="space-y-4 bg-bg-card border border-border-custom rounded-lg p-6">
            {/* Model A */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-model-a">Model A</label>
              <Select value={modelA} onValueChange={setModelA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.model} value={m.model}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model B */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-model-b">Model B</label>
              <Select value={modelB} onValueChange={setModelB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.model} value={m.model}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seed message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Seed Message</label>
              <Textarea
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            {/* Rounds slider */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">
                Rounds: {rounds}
              </label>
              <Slider
                value={[rounds]}
                onValueChange={(v) => setRounds(v[0])}
                min={1}
                max={7}
                step={1}
              />
              <div className="flex justify-between text-xs text-text-dim">
                <span>1</span>
                <span>7</span>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-danger">{formError}</p>
            )}

            <Button
              onClick={handleStart}
              disabled={starting || !modelA || !modelB}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {starting ? 'Starting...' : 'Start Experiment'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Live Theater ──
  return (
    <div className="h-screen flex flex-col bg-bg-deep">
      <ExperimentHeader
        modelA={modelAName}
        modelB={modelBName}
        state={experiment}
        connected={connected}
      />

      {sseError && (
        <div className="px-4 py-2 bg-warning/10 text-warning text-sm text-center">
          {sseError}
        </div>
      )}

      <VocabPanel
        vocab={experiment.vocab}
        matchId={matchId}
        modelA={modelAName}
      />

      {/* Split columns */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        <ConversationColumn
          speakerName={modelAName}
          turns={experiment.turns}
          thinkingSpeaker={experiment.thinkingSpeaker}
          color="model-a"
        />
        <ConversationColumn
          speakerName={modelBName}
          turns={experiment.turns}
          thinkingSpeaker={experiment.thinkingSpeaker}
          color="model-b"
        />
      </div>

      {/* Footer: new experiment button after completion */}
      {experiment.status === 'completed' && (
        <div className="px-4 py-3 border-t border-border-custom text-center">
          <Button onClick={handleNewExperiment} variant="outline">
            New Experiment
          </Button>
        </div>
      )}
    </div>
  )
}

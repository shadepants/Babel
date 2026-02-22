import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { ConversationColumn } from '@/components/theater/ConversationColumn'
import { ExperimentHeader } from '@/components/theater/ExperimentHeader'
import { VocabPanel } from '@/components/theater/VocabPanel'
import { TheaterCanvas } from '@/components/theater/TheaterCanvas'

const COLOR_A  = '#F59E0B'   // amber
const COLOR_B  = '#06B6D4'   // cyan
const COLOR_DEFAULT = '#8b5cf6' // accent purple (idle)

export default function Theater() {
  const { matchId } = useParams<{ matchId: string }>()
  const location = useLocation()

  const [modelAName, setModelAName] = useState(
    (location.state as { modelAName?: string })?.modelAName ?? ''
  )
  const [modelBName, setModelBName] = useState(
    (location.state as { modelBName?: string })?.modelBName ?? ''
  )

  useEffect(() => {
    if (matchId && !modelAName && !modelBName) {
      api.getExperiment(matchId)
        .then((exp) => {
          setModelAName(exp.model_a.split('/').pop() ?? exp.model_a)
          setModelBName(exp.model_b.split('/').pop() ?? exp.model_b)
        })
        .catch(console.error)
    }
  }, [matchId, modelAName, modelBName])

  const { events, connected, error: sseError } = useSSE(matchId ?? null)
  const experiment = useExperimentState(events)

  // ── Color bleed — update body data-attr so CSS transitions the nav border ──
  useEffect(() => {
    const root = document.documentElement
    const speaking = experiment.thinkingSpeaker

    if (speaking === modelAName) {
      root.setAttribute('data-active-model', 'a')
      root.style.setProperty('--color-active', COLOR_A)
    } else if (speaking === modelBName) {
      root.setAttribute('data-active-model', 'b')
      root.style.setProperty('--color-active', COLOR_B)
    } else if (experiment.turns.length > 0) {
      // Hold the last speaker's color between turns
      const last = experiment.turns[experiment.turns.length - 1]
      const isA = last.speaker === modelAName
      root.setAttribute('data-active-model', isA ? 'a' : 'b')
      root.style.setProperty('--color-active', isA ? COLOR_A : COLOR_B)
    }
  }, [experiment.thinkingSpeaker, experiment.turns, modelAName, modelBName])

  // ── Reset color bleed when leaving Theater ────────────────────────────────
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-active-model')
      document.documentElement.style.setProperty('--color-active', COLOR_DEFAULT)
    }
  }, [])

  // Derived: last turn + last vocab for canvas
  const lastTurn  = experiment.turns.length > 0
    ? experiment.turns[experiment.turns.length - 1]
    : null
  const lastVocab = experiment.vocab.length > 0
    ? experiment.vocab[experiment.vocab.length - 1]
    : null

  if (!matchId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-text-dim text-lg">No experiment selected</p>
          <Link to="/" className="text-accent hover:underline text-sm">
            Go to Seed Lab
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
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

      {/* Split columns — relative so TheaterCanvas positions inside it */}
      <div className="flex-1 relative grid grid-cols-2 gap-4 p-4 min-h-0">
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={lastVocab}
          modelAName={modelAName}
        />
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

      {experiment.status === 'completed' && (
        <div className="px-4 py-3 border-t border-border-custom text-center">
          <Link to="/">
            <Button variant="outline">New Experiment</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

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
          scores={experiment.scores}
        />
        <ConversationColumn
          speakerName={modelBName}
          turns={experiment.turns}
          thinkingSpeaker={experiment.thinkingSpeaker}
          color="model-b"
          scores={experiment.scores}
        />
      </div>

      {experiment.verdict && (
        <div className="px-6 py-4 border-t border-accent/30 bg-bg-card/50">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="neural-section-label">// final_verdict</div>
            <div className="font-display font-black tracking-widest text-base">
              {experiment.verdict.winner === 'tie' ? (
                <span className="text-accent">TIE</span>
              ) : (
                <>
                  <span className="font-mono text-[10px] text-text-dim/60 font-normal tracking-wider uppercase">winner: </span>
                  <span className={experiment.verdict.winner === 'model_a' ? 'text-model-a' : 'text-model-b'}>
                    {experiment.verdict.winner === 'model_a' ? modelAName : modelBName}
                  </span>
                </>
              )}
            </div>
            <p className="font-mono text-xs text-text-dim/75 leading-relaxed">
              {experiment.verdict.reasoning}
            </p>
          </div>
        </div>
      )}

      {experiment.status === 'running' && (
        <div className="px-4 py-2 border-t border-border-custom text-center">
          <Button
            variant="outline"
            className="font-mono text-xs text-danger border-danger/30 hover:bg-danger/10"
            onClick={async () => {
              if (matchId) {
                try {
                  await api.stopExperiment(matchId)
                } catch (err) {
                  console.error('Failed to stop:', err)
                }
              }
            }}
          >
            Stop Experiment
          </Button>
        </div>
      )}

      {(experiment.status === 'completed' || experiment.status === 'stopped') && (
        <div className="px-4 py-3 border-t border-border-custom flex items-center justify-center gap-3">
          <Link to={`/analytics/${matchId}`}>
            <Button variant="outline" className="font-mono text-xs">Analytics</Button>
          </Link>
          <Link to={`/dictionary/${matchId}`}>
            <Button variant="outline" className="font-mono text-xs">Dictionary</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="font-mono text-xs">New Experiment</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { ConversationColumn } from '@/components/theater/ConversationColumn'
import { ExperimentHeader } from '@/components/theater/ExperimentHeader'
import { VocabPanel } from '@/components/theater/VocabPanel'

export default function Theater() {
  const { matchId } = useParams<{ matchId: string }>()
  const location = useLocation()

  // Model names — passed via location.state from Configure, or fetched from API
  const [modelAName, setModelAName] = useState(
    (location.state as { modelAName?: string })?.modelAName ?? ''
  )
  const [modelBName, setModelBName] = useState(
    (location.state as { modelBName?: string })?.modelBName ?? ''
  )

  // Fetch experiment record as fallback for model names (e.g. direct URL nav)
  useEffect(() => {
    if (matchId && !modelAName && !modelBName) {
      api.getExperiment(matchId)
        .then((exp) => {
          // exp.model_a is a litellm string — extract display name
          setModelAName(exp.model_a.split('/').pop() ?? exp.model_a)
          setModelBName(exp.model_b.split('/').pop() ?? exp.model_b)
        })
        .catch(console.error)
    }
  }, [matchId, modelAName, modelBName])

  // ── SSE + derived state ──
  const { events, connected, error: sseError } = useSSE(matchId ?? null)
  const experiment = useExperimentState(events)

  // No matchId — show empty state
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

  // ── Render: Live Theater ──
  return (
    <div className="flex-1 flex flex-col bg-bg-deep">
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
          <Link to="/">
            <Button variant="outline">
              New Experiment
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

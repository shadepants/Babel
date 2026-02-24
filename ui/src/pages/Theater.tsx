import { useState, useEffect } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { ConversationColumn } from '@/components/theater/ConversationColumn'
import { ExperimentHeader } from '@/components/theater/ExperimentHeader'
import { VocabPanel } from '@/components/theater/VocabPanel'
import { TheaterCanvas } from '@/components/theater/TheaterCanvas'
import { ArenaStage } from '@/components/theater/ArenaStage'
import type { SpriteStatus } from '@/components/theater/SpriteAvatar'
import { TypewriterText } from '@/components/theater/TypewriterText'
import type { TurnEvent, ScoreEvent, VocabEvent, ObserverEvent } from '@/api/types'

const COLOR_A       = '#F59E0B'
const COLOR_B       = '#06B6D4'
const COLOR_DEFAULT = '#8b5cf6'

export default function Theater() {
  const { matchId }  = useParams<{ matchId: string }>()
  const location     = useLocation()
  const navigate     = useNavigate()

  const [modelAName, setModelAName] = useState(
    (location.state as { modelAName?: string })?.modelAName ?? ''
  )
  const [modelBName, setModelBName] = useState(
    (location.state as { modelBName?: string })?.modelBName ?? ''
  )
  const [preset, setPreset] = useState<string | null>(null)

  // DB fallback: turns + scores + verdict loaded when SSE history is gone (e.g. server restart)
  const [dbTurns, setDbTurns]     = useState<TurnEvent[]>([])
  const [dbScores, setDbScores]   = useState<Record<number, ScoreEvent>>({})
  const [dbVerdict, setDbVerdict] = useState<{ winner: string; winner_model: string; reasoning: string } | null>(null)
  const [dbVocab, setDbVocab] = useState<VocabEvent[]>([])

  // Human injection state
  const [injectText, setInjectText] = useState('')
  const [injecting, setInjecting] = useState(false)

  // Track which speaker is currently "talking" (typewriter active)
  const [talkingSpeaker, setTalkingSpeaker] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) return
    api.getExperiment(matchId)
      .then((exp) => {
        if (!modelAName) setModelAName(exp.model_a.split('/').pop() ?? exp.model_a)
        if (!modelBName) setModelBName(exp.model_b.split('/').pop() ?? exp.model_b)
        setPreset(exp.preset ?? null)

        // For completed/stopped experiments, pre-load turns/scores/verdict from DB so Theater
        // is never empty when SSE history has been wiped (e.g. server restart).
        if (exp.status === 'completed' || exp.status === 'stopped' || exp.status === 'error') {
          api.getExperimentTurns(matchId)
            .then(({ turns }) => {
              setDbTurns(turns.map((r) => ({
                type: 'relay.turn' as const,
                turn_id: String(r.id),
                round: r.round,
                speaker: r.speaker,
                model: r.model,
                content: r.content,
                latency_s: r.latency_seconds ?? 0,
                timestamp: new Date(r.created_at).getTime() / 1000,
                match_id: matchId,
              })))
            })
            .catch(console.error)
          api.getExperimentScores(matchId)
            .then(({ scores }) => {
              const map: Record<number, ScoreEvent> = {}
              for (const s of scores) {
                map[s.turn_id] = {
                  type: 'relay.score',
                  turn_id: s.turn_id,
                  creativity: s.creativity,
                  coherence: s.coherence,
                  engagement: s.engagement,
                  novelty: s.novelty,
                  timestamp: new Date(s.scored_at).getTime() / 1000,
                  match_id: matchId,
                }
              }
              setDbScores(map)
            })
            .catch(console.error)
          api.getVocabulary(matchId)
            .then(({ words }) => {
              setDbVocab(words.map((w) => ({
                type: 'relay.vocab' as const,
                word: w.word,
                meaning: w.meaning ?? null,
                coined_by: w.coined_by,
                coined_round: w.coined_round,
                category: w.category ?? null,
                parent_words: w.parent_words ?? [],
                timestamp: 0,
                match_id: matchId,
              })))
            })
            .catch(console.error)
          if (exp.winner && exp.verdict_reasoning) {
            setDbVerdict({
              winner: exp.winner,
              winner_model: exp.winner === 'model_a' ? exp.model_a
                : exp.winner === 'model_b' ? exp.model_b
                : 'tie',
              reasoning: exp.verdict_reasoning,
            })
          }
        }
      })
      .catch(console.error)
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { events, connected, error: sseError } = useSSE(matchId ?? null)
  const experiment = useExperimentState(events)

  // SSE takes precedence; DB data fills in when SSE history is unavailable
  const effectiveTurns   = experiment.turns.length  > 0 ? experiment.turns  : dbTurns
  const effectiveScores  = Object.keys(experiment.scores).length > 0 ? experiment.scores : dbScores
  const effectiveVerdict = experiment.verdict ?? dbVerdict
  const effectiveVocab   = experiment.vocab.length > 0 ? experiment.vocab : dbVocab

  // Derived: last turn + last vocab for canvas
  const lastTurn  = effectiveTurns.length > 0
    ? effectiveTurns[effectiveTurns.length - 1]
    : null
  const lastVocab = experiment.vocab.length > 0
    ? experiment.vocab[experiment.vocab.length - 1]
    : null

  // Typewriter sync -- set talkingSpeaker when a new turn arrives, clear after estimated duration
  useEffect(() => {
    if (!lastTurn) return
    setTalkingSpeaker(lastTurn.speaker)
    const durationMs = Math.min(8000, lastTurn.content.length * 10 + 300)
    const id = setTimeout(() => setTalkingSpeaker(null), durationMs)
    return () => clearTimeout(id)
  }, [lastTurn?.turn_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Latest turn id -- only live experiments get typewriter effect
  const latestTurnId = experiment.status === 'running' && lastTurn
    ? lastTurn.turn_id
    : null

  // BABEL glitch on turn arrival (live only)
  useEffect(() => {
    if (experiment.status !== 'running' || !lastTurn) return
    window.dispatchEvent(new CustomEvent('babel-glitch'))
  }, [lastTurn?.turn_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab title — live round counter while running, done indicator when complete
  useEffect(() => {
    const base = 'Babel'
    if (experiment.status === 'running' || experiment.status === 'paused') {
      document.title = `${experiment.status === 'paused' ? '\u23F8' : '\u25CF'} R.${lastTurn?.round ?? 0} | ${base}`
    } else if (experiment.status === 'completed' || experiment.status === 'stopped') {
      document.title = `\u2713 Done | ${base}`
    }
    return () => { document.title = base }
  }, [experiment.status, lastTurn?.round]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sprite status derivation -- verdict overrides all
  const statusA: SpriteStatus = effectiveVerdict
    ? effectiveVerdict.winner === 'model_a' ? 'winner'
    : effectiveVerdict.winner === 'tie'     ? 'idle'
    : 'loser'
    : experiment.status === 'error'            ? 'error'
    : experiment.thinkingSpeaker === modelAName ? 'thinking'
    : talkingSpeaker === modelAName             ? 'talking'
    : 'idle'

  const statusB: SpriteStatus = effectiveVerdict
    ? effectiveVerdict.winner === 'model_b' ? 'winner'
    : effectiveVerdict.winner === 'tie'     ? 'idle'
    : 'loser'
    : experiment.status === 'error'            ? 'error'
    : experiment.thinkingSpeaker === modelBName ? 'thinking'
    : talkingSpeaker === modelBName             ? 'talking'
    : 'idle'

  // Color bleed -- update body data-attr so CSS transitions the nav border
  useEffect(() => {
    const root = document.documentElement
    const speaking = experiment.thinkingSpeaker

    if (speaking === modelAName) {
      root.setAttribute('data-active-model', 'a')
      root.style.setProperty('--color-active', COLOR_A)
    } else if (speaking === modelBName) {
      root.setAttribute('data-active-model', 'b')
      root.style.setProperty('--color-active', COLOR_B)
    } else if (effectiveTurns.length > 0) {
      const last = effectiveTurns[effectiveTurns.length - 1]
      const isA  = last.speaker === modelAName
      root.setAttribute('data-active-model', isA ? 'a' : 'b')
      root.style.setProperty('--color-active', isA ? COLOR_A : COLOR_B)
    }
  }, [experiment.thinkingSpeaker, effectiveTurns, modelAName, modelBName])

  // Reset color bleed when leaving Theater
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-active-model')
      document.documentElement.style.setProperty('--color-active', COLOR_DEFAULT)
    }
  }, [])

  if (!matchId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-text-dim text-lg">No experiment selected</p>
          <Link to="/" className="text-accent hover:underline text-sm">Go to Seed Lab</Link>
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

      {/* Arena stage -- sprites + preset gradient */}
      <ArenaStage
        modelAName={modelAName}
        modelBName={modelBName}
        statusA={statusA}
        statusB={statusB}
        preset={preset}
      />

      {/* Split conversation columns */}
      <div className="flex-1 relative grid grid-cols-2 gap-3 p-3 min-h-0">
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={lastVocab}
          modelAName={modelAName}
        />
        <ConversationColumn
          speakerName={modelAName}
          turns={effectiveTurns}
          thinkingSpeaker={experiment.thinkingSpeaker}
          color="model-a"
          scores={effectiveScores}
          latestTurnId={latestTurnId}
          vocab={effectiveVocab}
          experimentId={matchId}
        />
        <ConversationColumn
          speakerName={modelBName}
          turns={effectiveTurns}
          thinkingSpeaker={experiment.thinkingSpeaker}
          color="model-b"
          scores={effectiveScores}
          latestTurnId={latestTurnId}
          vocab={effectiveVocab}
          experimentId={matchId}
        />
      </div>

      {/* Observer commentary -- inline centered cards */}
      {experiment.observers.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          {experiment.observers.map((obs: ObserverEvent, i: number) => (
            <div key={i} className="flex justify-center">
              <div className="max-w-xl bg-bg-card/60 border border-accent/20 rounded px-4 py-2 text-center">
                <div className="font-mono text-[10px] text-text-dim/60 uppercase tracking-wider mb-1">
                  observer &middot; after turn {obs.after_turn}
                </div>
                <p className="font-mono text-xs text-text-dim/80 leading-relaxed italic">
                  {obs.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verdict -- typewriter reveal for the reasoning text */}
      {effectiveVerdict && (
        <div className="px-6 py-4 border-t border-accent/25 bg-bg-card/60">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="neural-section-label">// final_verdict</div>
            <div className="font-display font-black tracking-widest text-base">
              {effectiveVerdict.winner === 'tie' ? (
                <span className="text-accent">TIE</span>
              ) : (
                <>
                  <span className="font-mono text-[10px] text-text-dim/60 font-normal tracking-wider uppercase">
                    winner:{' '}
                  </span>
                  <span className={effectiveVerdict.winner === 'model_a' ? 'text-model-a' : 'text-model-b'}>
                    {effectiveVerdict.winner === 'model_a' ? modelAName : modelBName}
                  </span>
                </>
              )}
            </div>
            <p className="font-mono text-xs text-text-dim/70 leading-relaxed">
              <TypewriterText text={effectiveVerdict.reasoning} active speedMs={6} />
            </p>
          </div>
        </div>
      )}

      {(experiment.status === 'running' || experiment.status === 'paused') && (
        <div className="px-4 py-2 border-t border-border-custom space-y-2">
          {/* Human injection textarea — only visible when paused */}
          {experiment.status === 'paused' && (
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 font-mono text-xs bg-bg-card border border-accent/30 rounded p-2 text-text-primary resize-none focus:outline-none focus:border-accent/60"
                rows={2}
                placeholder="Type a message to inject as a human turn..."
                value={injectText}
                onChange={(e) => setInjectText(e.target.value)}
              />
              <Button
                variant="outline"
                className="font-mono text-xs text-accent border-accent/30 hover:bg-accent/10 shrink-0"
                disabled={!injectText.trim() || injecting}
                onClick={async () => {
                  if (!matchId || !injectText.trim()) return
                  setInjecting(true)
                  try {
                    await api.injectTurn(matchId, injectText.trim())
                    setInjectText('')
                  } catch (err) { console.error('Failed to inject:', err) }
                  finally { setInjecting(false) }
                }}
              >
                {injecting ? 'Injecting...' : 'Inject'}
              </Button>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {experiment.status === 'running' ? (
              <Button
                variant="outline"
                className="font-mono text-xs text-warning border-warning/30 hover:bg-warning/10"
                onClick={async () => {
                  if (matchId) {
                    try { await api.pauseExperiment(matchId) }
                    catch (err) { console.error('Failed to pause:', err) }
                  }
                }}
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                className="font-mono text-xs text-accent border-accent/30 hover:bg-accent/10"
                onClick={async () => {
                  if (matchId) {
                    try { await api.resumeExperiment(matchId) }
                    catch (err) { console.error('Failed to resume:', err) }
                  }
                }}
              >
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              className="font-mono text-xs text-danger border-danger/30 hover:bg-danger/10"
              onClick={async () => {
                if (matchId) {
                  try { await api.stopExperiment(matchId) }
                  catch (err) { console.error('Failed to stop:', err) }
                }
              }}
            >
              Stop
            </Button>
          </div>
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
          <Button
            variant="outline"
            className="font-mono text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => navigate(`/configure/${preset ?? 'conlang'}?fork=${matchId}`)}
          >
            // Fork
          </Button>
          <Link to="/">
            <Button variant="outline" className="font-mono text-xs">New Experiment</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

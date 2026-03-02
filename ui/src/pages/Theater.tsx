import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import { Button } from '@/components/ui/button'
import { ConversationColumn, AGENT_COLORS } from '@/components/theater/ConversationColumn'
import { ExperimentHeader } from '@/components/theater/ExperimentHeader'
import { VocabPanel } from '@/components/theater/VocabPanel'
import { TheaterCanvas } from '@/components/theater/TheaterCanvas'
import { ArenaStage } from '@/components/theater/ArenaStage'
import type { SpriteStatus } from '@/components/theater/SpriteAvatar'
import { TypewriterText } from '@/components/theater/TypewriterText'
import { EndSessionModal } from '@/components/theater/EndSessionModal'
import { DiceOverlay } from '@/components/theater/DiceOverlay'
import { EchoChamberWarning } from '@/components/theater/EchoChamberWarning'
import { AgendaRevealOverlay } from '@/components/theater/AgendaRevealOverlay'
import type { ObserverEvent, ExperimentRecord } from '@/api/types'
import { resolveWinnerIndex } from '@/lib/spriteStatus'
import { useTheaterData } from '@/hooks/useTheaterData'
import { useColorBleed } from '@/hooks/useColorBleed'

// ── component ───────────────────────────────────────────────────

export default function Theater() {
  const { matchId }  = useParams<{ matchId: string }>()
  const location     = useLocation()
  const navigate     = useNavigate()

  // Legacy location.state names (Configure passes these for old 2-agent path)
  const locNameA = (location.state as { modelAName?: string })?.modelAName ?? ''
  const locNameB = (location.state as { modelBName?: string })?.modelBName ?? ''

  // Load all REST data (experiment record, turns, scores, vocab, verdict)
  const {
    experiment: dbExperiment,
    agentSlots,
    preset,
    parentId,
    hasHiddenGoals,
    dbTurns,
    dbScores,
    dbVerdict,
    dbVocab,
  } = useTheaterData(matchId, locNameA, locNameB)

  // Human injection state
  const [injectText, setInjectText] = useState('')
  const [injecting, setInjecting] = useState(false)

  const [talkingSpeaker, setTalkingSpeaker] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeRoll, setActiveRoll] = useState<{ skill: string; dc: number; result: number; success: boolean } | null>(null)
  const [echoDismissed, setEchoDismissed] = useState(false)
  const [agendaDismissed, setAgendaDismissed] = useState(false)

  // Spec 018: Baseline Control state
  const [baselinePolling, setBaselinePolling] = useState(false)
  const [baselineRunning, setBaselineRunning] = useState(false)
  const [baselineExp, setBaselineExp] = useState<ExperimentRecord | null>(null)
  const [baselineVocabCount, setBaselineVocabCount] = useState<number | null>(null)
  const [baselineAvgScore, setBaselineAvgScore] = useState<number | null>(null)
  const [launchingBaseline, setLaunchingBaseline] = useState(false)
  const [baselineToast, setBaselineToast] = useState<string | null>(null)

  // BUG 7 FIX: stable callback for DiceOverlay onComplete (was inline arrow, reset animation each render)
  const handleRollComplete = useCallback(() => setActiveRoll(null), [])
  const handleEchoDismiss = useCallback(() => setEchoDismissed(true), [])
  const handleAgendaDismiss = useCallback(() => setAgendaDismissed(true), [])

  // Spec 018: start polling if dbExperiment already has a linked baseline
  useEffect(() => {
    if (dbExperiment?.baseline_experiment_id && !baselinePolling && !baselineExp) {
      setBaselinePolling(true)
    }
  }, [dbExperiment?.baseline_experiment_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Spec 018: poll GET /api/experiments/:id/baseline every 15s while running
  useEffect(() => {
    if (!baselinePolling || !matchId || baselineExp) return
    let cancelled = false

    async function pollOnce() {
      if (cancelled) return
      try {
        const result = await api.getExperimentBaseline(matchId!)
        if (cancelled) return
        if ('id' in result) {
          const exp = result as ExperimentRecord
          setBaselineExp(exp)
          setBaselineRunning(false)
          setBaselinePolling(false)
          try {
            const [vocabRes, scoresRes] = await Promise.all([
              api.getVocabulary(exp.id),
              api.getExperimentScores(exp.id),
            ])
            if (!cancelled) {
              setBaselineVocabCount(vocabRes.words.length)
              if (scoresRes.scores.length > 0) {
                const avg = scoresRes.scores.reduce(
                  (acc, s) => acc + (s.creativity + s.coherence + s.engagement + s.novelty) / 4, 0
                ) / scoresRes.scores.length
                setBaselineAvgScore(Math.round(avg * 10) / 10)
              }
            }
          } catch { /* supplemental data unavailable */ }
        } else {
          setBaselineRunning(true)
        }
      } catch {
        setBaselinePolling(false)  // 404 = not linked yet; stop
      }
    }

    pollOnce()
    const interval = setInterval(pollOnce, 15_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [baselinePolling, matchId, baselineExp])

  // Spec 018: launch a baseline comparison run
  async function handleRunBaseline() {
    if (!dbExperiment || !matchId) return
    setLaunchingBaseline(true)
    try {
      await api.startRelay({
        preset: 'baseline',
        seed: '',  // server resolves from preset
        model_a: dbExperiment.model_a,
        model_b: dbExperiment.model_b,
        rounds: dbExperiment.rounds_planned,
        temperature_a: dbExperiment.temperature_a ?? 0.7,
        temperature_b: dbExperiment.temperature_b ?? 0.7,
        max_tokens: 1000,
        enable_scoring: !!(dbExperiment.enable_scoring),
        enable_verdict: !!(dbExperiment.enable_verdict),
        baseline_for_experiment_id: matchId,
      })
      setBaselineToast('Baseline running \u2014 check back soon')
      setBaselineRunning(true)
      setBaselinePolling(true)
      setTimeout(() => setBaselineToast(null), 5000)
    } catch {
      setBaselineToast('Failed to launch baseline')
      setTimeout(() => setBaselineToast(null), 5000)
    } finally {
      setLaunchingBaseline(false)
    }
  }

  const { events, connected, error: sseError } = useSSE(matchId ?? null)
  const experiment = useExperimentState(events)

  // SSE takes precedence; DB data fills in when SSE history is unavailable
  const effectiveTurns   = experiment.turns.length  > 0 ? experiment.turns  : dbTurns
  const effectiveScores  = Object.keys(experiment.scores).length > 0 ? experiment.scores : dbScores
  const effectiveVerdict = experiment.verdict ?? dbVerdict
  const effectiveVocab   = experiment.vocab.length > 0 ? experiment.vocab : dbVocab

  // Spec 018: source avg score for delta panel (after effectiveScores is defined)
  const sourceAvgScore: number | null = (() => {
    const vals = Object.values(effectiveScores as Record<string, { creativity: number; coherence: number; engagement: number; novelty: number }>)
    if (vals.length === 0) return null
    const sum = vals.reduce((acc, s) => acc + (s.creativity + s.coherence + s.engagement + s.novelty) / 4, 0)
    return Math.round(sum / vals.length * 10) / 10
  })()

  // Derived shorthands for legacy 2-agent props
  const modelAName = agentSlots[0]?.name ?? ''
  const modelBName = agentSlots[1]?.name ?? ''

  // Derived: last turn + last vocab for canvas
  const lastTurn  = effectiveTurns.length > 0
    ? effectiveTurns[effectiveTurns.length - 1]
    : null
  const lastVocab = experiment.vocab.length > 0
    ? experiment.vocab[experiment.vocab.length - 1]
    : null

  // Typewriter sync: fires once per new turn_id.
  // lastTurn.content and lastTurn.speaker are intentionally read inside the effect
  // without being listed as dependencies — this effect must run exactly once per
  // new turn arrival (keyed on turn_id), not re-fire when content identity changes.
  useEffect(() => {
    if (!lastTurn) return
    setTalkingSpeaker(lastTurn.speaker)
    const durationMs = Math.min(8000, lastTurn.content.length * 10 + 300)
    const id = setTimeout(() => setTalkingSpeaker(null), durationMs)
    return () => clearTimeout(id)
  }, [lastTurn?.turn_id])

  // Latest turn id -- only live experiments get typewriter effect
  const latestTurnId = experiment.status === 'running' && lastTurn
    ? lastTurn.turn_id
    : null

  // Phase 17: Visual Choice Architecture (3D Dice)
  useEffect(() => {
    if (!lastTurn || experiment.status !== 'running') return
    const checkMatch = lastTurn.content.match(/\[CHECK:\s*(\w+)\s*DC(\d+)\s*Result:\s*(\d+)\]/i)
    if (checkMatch) {
      const skill = checkMatch[1]
      const dc = parseInt(checkMatch[2], 10)
      const result = parseInt(checkMatch[3], 10)
      setActiveRoll({ skill, dc, result, success: result >= dc })
    }
  }, [lastTurn?.turn_id, experiment.status])

  // BABEL glitch on turn arrival (live only).
  // experiment.status is read inside but not listed: the effect is intentionally
  // keyed on turn_id so it fires once per new turn, not on every status transition.
  useEffect(() => {
    if (experiment.status !== 'running' || !lastTurn) return
    window.dispatchEvent(new CustomEvent('babel-glitch'))
  }, [lastTurn?.turn_id]) // intentionally keyed on turn_id — experiment.status is a guard, not a trigger

  // Tab title
  useEffect(() => {
    const base = 'Babel'
    if (experiment.status === 'running' || experiment.status === 'paused') {
      document.title = `${experiment.status === 'paused' ? '\u23F8' : '\u25CF'} R.${lastTurn?.round ?? 0} | ${base}`
    } else if (experiment.status === 'completed' || experiment.status === 'stopped') {
      document.title = `\u2713 Done | ${base}`
    }
    return () => { document.title = base }
  }, [experiment.status, lastTurn?.round])

  // Color bleed: sets --color-active CSS variable + data-active-model attribute
  useColorBleed(experiment.thinkingSpeaker, effectiveTurns, agentSlots)

  // Sprite statuses -- N-way: derive status for each agent slot
  const winnerIndex = effectiveVerdict ? resolveWinnerIndex(effectiveVerdict.winner) : null
  const spriteStatuses: SpriteStatus[] = agentSlots.map((slot, idx) => {
    if (experiment.status === 'error') return 'error'
    if (effectiveVerdict) {
      if (effectiveVerdict.winner === 'tie') return 'idle'
      return winnerIndex === idx ? 'winner' : 'loser'
    }
    if (experiment.thinkingSpeaker === slot.name) return 'thinking'
    if (talkingSpeaker === slot.name) return 'talking'
    return 'idle'
  })

  // BUG 1 FIX: moved above the early return guard (was after it, violating Rules of Hooks)
  useEffect(() => {
    if (experiment.status === 'completed' || experiment.status === 'stopped') {
      setIsModalOpen(true)
    }
  }, [experiment.status])

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
        modelAVersion={dbExperiment?.model_a_version}
        modelBVersion={dbExperiment?.model_b_version}
      />

      {/* Adversarial mode banner */}
      {hasHiddenGoals && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-center">
          <span className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase text-amber-400">
            &#9888; Adversarial Mode &mdash; Hidden agendas active
          </span>
        </div>
      )}

      {/* Audit started banner */}
      {experiment.auditExperimentId && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-center">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-amber-400">
            Audit experiment running &mdash;{' '}
            <Link to={`/theater/${experiment.auditExperimentId}`} className="underline hover:text-amber-300">
              View Audit
            </Link>
          </span>
        </div>
      )}

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

      {/* Arena stage -- N sprites */}
      <ArenaStage
        agents={agentSlots.map((slot, idx) => ({ name: slot.name, status: spriteStatuses[idx] ?? 'idle' }))}
        preset={preset}
      />

      {/* N-way conversation columns -- dynamic grid */}
      <div
        className="flex-1 relative grid gap-3 p-3 min-h-0"
        style={{ gridTemplateColumns: `repeat(${agentSlots.length}, 1fr)` }}
      >
        {/* Echo Chamber Warning overlay */}
        {experiment.echoSimilarity != null && experiment.echoSimilarity >= 0.65 && !echoDismissed && (
          <EchoChamberWarning
            similarity={experiment.echoSimilarity}
            interventionFired={experiment.interventionFired}
            onDismiss={handleEchoDismiss}
          />
        )}
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={lastVocab}
          modelAName={modelAName}
        />
        {agentSlots.map((slot, idx) => (
          <ConversationColumn
            key={slot.name || idx}
            speakerName={slot.name}
            turns={effectiveTurns}
            thinkingSpeaker={experiment.thinkingSpeaker}
            agentIndex={idx}
            scores={effectiveScores}
            latestTurnId={latestTurnId}
            vocab={effectiveVocab}
            experimentId={matchId}
          />
        ))}
      </div>

      {/* Observer commentary */}
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

      {/* Verdict */}
      {effectiveVerdict && (
        <div className="px-6 py-4 border-t border-accent/25 bg-bg-card/60">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="neural-section-label">// final_verdict</div>
            <div className="font-display font-black tracking-widest text-base">
              {effectiveVerdict.winner === 'tie' ? (
                <span className="text-accent">TIE</span>
              ) : (() => {
                const idx = resolveWinnerIndex(effectiveVerdict.winner)
                const winnerSlot = idx != null ? agentSlots[idx] : null
                const winnerColor = idx != null ? (AGENT_COLORS[idx] ?? AGENT_COLORS[0]) : AGENT_COLORS[0]
                return (
                  <>
                    <span className="font-mono text-[10px] text-text-dim/60 font-normal tracking-wider uppercase">
                      winner:{' '}
                    </span>
                    <span style={{ color: winnerColor }}>
                      {winnerSlot?.name ?? effectiveVerdict.winner_model}
                    </span>
                  </>
                )
              })()}
            </div>
            <p className="font-mono text-xs text-text-dim/70 leading-relaxed">
              <TypewriterText text={effectiveVerdict.reasoning} active speedMs={6} />
            </p>
          </div>
        </div>
      )}

      {(experiment.status === 'running' || experiment.status === 'paused') && (
        <div className="px-4 py-2 border-t border-border-custom space-y-2">
          {experiment.status === 'paused' && (
            <div className="flex gap-2 items-end">
              <textarea
                aria-label="Human turn injection"
                className="flex-1 font-mono text-xs bg-bg-card border border-accent/30 rounded p-2 text-text-primary resize-none focus:outline-none focus:border-accent/60"
                rows={2}
                placeholder="Type a message to inject as a human turn&#x2026;"
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
        <div className="px-4 py-3 border-t border-border-custom flex items-center justify-center gap-3 flex-wrap">
          <Link to={`/analytics/${matchId}`}>
            <Button variant="outline" className="font-mono text-xs">Analytics</Button>
          </Link>
          <Link to={`/dictionary/${matchId}`}>
            <Button variant="outline" className="font-mono text-xs">Dictionary</Button>
          </Link>
          {parentId && (
            <Link to={`/tree/${parentId}`}>
              <Button variant="outline" className="font-mono text-xs border-violet-500/50 text-violet-400 hover:bg-violet-500/10">
                // Tree
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            className="font-mono text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => navigate(`/configure/${preset ?? 'conlang'}?fork=${matchId}`)}
          >
            // Fork
          </Button>
          {/* Spec 018: Run Baseline Comparison — only on completed non-baseline experiments without a linked baseline */}
          {dbExperiment?.preset !== 'baseline' && !dbExperiment?.baseline_experiment_id && !baselineRunning && (
            <Button
              variant="outline"
              className="font-mono text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              disabled={launchingBaseline}
              onClick={handleRunBaseline}
            >
              {launchingBaseline ? 'Launching...' : '// Baseline'}
            </Button>
          )}
          {(baselineRunning || (dbExperiment?.baseline_experiment_id && !baselineExp)) && (
            <span className="font-mono text-[10px] text-amber-400/70 animate-pulse-slow">
              baseline running...
            </span>
          )}
          <Link to="/">
            <Button variant="outline" className="font-mono text-xs">New Experiment</Button>
          </Link>
        </div>
      )}

      {/* Spec 018: toast notification */}
      {baselineToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-card border border-amber-500/50 px-4 py-2 rounded font-mono text-xs text-amber-400 shadow-lg">
          {baselineToast}
        </div>
      )}

      {/* Spec 018: Baseline delta panel — shown when baseline is complete */}
      {baselineExp && baselineExp.status !== 'failed' && (
        <div className="px-6 py-4 border-t border-amber-500/25 bg-amber-500/5">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-amber-400/80">
              // vs_baseline
            </div>
            {dbExperiment?.judge_model && baselineExp.judge_model && dbExperiment.judge_model !== baselineExp.judge_model && (
              <div className="font-mono text-[10px] text-amber-300/70">
                &#9888; Judge model differs &mdash; score delta may not be comparable
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vocab delta */}
              <div className="bg-bg-card/60 border border-amber-500/20 rounded px-3 py-2">
                <div className="font-mono text-[9px] tracking-wider uppercase text-text-dim/50 mb-1">Vocab coined</div>
                <div className="font-mono text-sm font-bold text-text-primary">
                  {(() => {
                    const srcCount = effectiveVocab.length || dbVocab.length
                    const bCount = baselineVocabCount ?? 0
                    const delta = srcCount - bCount
                    return (
                      <>
                        <span className={delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-text-dim'}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                        <span className="text-[10px] text-text-dim/60 font-normal ml-2">
                          ({srcCount} vs {bCount})
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Score delta — only shown when scoring was enabled */}
              {dbExperiment?.enable_scoring && sourceAvgScore !== null && (
                <div className="bg-bg-card/60 border border-amber-500/20 rounded px-3 py-2">
                  <div className="font-mono text-[9px] tracking-wider uppercase text-text-dim/50 mb-1">Avg score</div>
                  <div className="font-mono text-sm font-bold text-text-primary">
                    {baselineAvgScore !== null ? (() => {
                      const delta = Math.round((sourceAvgScore - baselineAvgScore) * 10) / 10
                      return (
                        <>
                          <span className={delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-text-dim'}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                          <span className="text-[10px] text-text-dim/60 font-normal ml-2">
                            ({sourceAvgScore} vs {baselineAvgScore})
                          </span>
                        </>
                      )
                    })() : <span className="text-text-dim/50 text-xs">no scores</span>}
                  </div>
                </div>
              )}

              {/* Rounds parity */}
              <div className="bg-bg-card/60 border border-amber-500/20 rounded px-3 py-2">
                <div className="font-mono text-[9px] tracking-wider uppercase text-text-dim/50 mb-1">Rounds parity</div>
                <div className="font-mono text-sm font-bold text-text-primary">
                  {dbExperiment?.rounds_completed === baselineExp.rounds_completed ? (
                    <span className="text-emerald-400">&#10003; both {dbExperiment?.rounds_completed}/{dbExperiment?.rounds_planned}</span>
                  ) : (
                    <span className="text-amber-400">&#10007; {dbExperiment?.rounds_completed} vs {baselineExp.rounds_completed}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {baselineExp?.status === 'failed' && (
        <div className="px-6 py-3 border-t border-amber-500/25 text-center">
          <span className="font-mono text-[10px] text-amber-400/70">
            Baseline run failed &mdash;{' '}
            <button
              className="underline hover:text-amber-300"
              onClick={handleRunBaseline}
              disabled={launchingBaseline}
            >
              re-run
            </button>
          </span>
        </div>
      )}

      <EndSessionModal
        isOpen={isModalOpen}
        matchId={matchId}
        preset={preset}
        stats={{
          turns: effectiveTurns.length,
          rounds: lastTurn?.round ?? 0,
          vocab: experiment.vocab.length || dbVocab.length
        }}
      />

      <DiceOverlay
        roll={activeRoll}
        onComplete={handleRollComplete}
      />

      <AgendaRevealOverlay
        goals={!agendaDismissed ? experiment.revealedGoals : null}
        agentNames={agentSlots.map(s => s.name)}
        onDismiss={handleAgendaDismiss}
      />
    </div>
  )
}

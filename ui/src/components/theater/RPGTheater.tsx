import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSSE } from '@/api/sse'
import { useExperimentState } from '@/api/hooks'
import { api } from '@/api/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HumanInput } from './HumanInput'
import { ThinkingIndicator } from './ThinkingIndicator'
import { SpriteAvatar } from './SpriteAvatar'
import { TheaterCanvas } from './TheaterCanvas'
import { EndSessionModal } from './EndSessionModal'
import { DiceOverlay } from './DiceOverlay'
import type { TurnEvent } from '@/api/types'

/** Speaker role colors (CSS rgb values) */
const ROLE_COLORS: Record<string, string> = {
  dm: '#F59E0B',       // amber
  player: '#10B981',   // emerald
  default: '#06B6D4',  // cyan (AI party members)
}

function speakerColor(speaker: string, participants: Array<{ name: string; role: string }> | null): string {
  if (!participants) return ROLE_COLORS.default
  const p = participants.find((pp) => pp.name.toLowerCase() === speaker.toLowerCase())
  if (!p) return ROLE_COLORS.default
  const role = p.role.toLowerCase()
  return ROLE_COLORS[role] ?? ROLE_COLORS.default
}

/** Single turn in the chronological log */
function RPGTurnEntry({
  turn,
  color,
}: {
  turn: TurnEvent
  color: string
}) {
  return (
    <div className="animate-fade-in py-2">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-xs font-semibold" style={{ color }}>
          {turn.speaker}
        </span>
        <span className="font-mono text-[9px] text-slate-500 tabular-nums">
          R.{turn.round} &middot; {turn.latency_s}s
        </span>
      </div>
      <div
        className="font-mono text-sm text-slate-200 leading-relaxed pl-3 whitespace-pre-wrap break-words"
        style={{ borderLeft: `2px solid ${color}40` }}
      >
        {turn.content}
      </div>
    </div>
  )
}

/**
 * RPGTheater - full-page RPG session view.
 *
 * Layout: left sidebar (party roster) + center (scrolling chat log + HumanInput).
 * All turns shown chronologically, colored by speaker role.
 * Background canvas renders expanding pulse rings and vocab burst animations.
 */
export default function RPGTheater() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { events } = useSSE(matchId)
  const state = useExperimentState(events)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  // Load participants from experiment record
  const [participants, setParticipants] = useState<Array<{ name: string; model: string; role: string }> | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeRoll, setActiveRoll] = useState<{ skill: string; dc: number; result: number; success: boolean } | null>(null)

  useEffect(() => {
    if (!matchId) return
    api.getExperiment(matchId).then((exp) => {
      if (exp.participants_json) {
        try {
          setParticipants(JSON.parse(exp.participants_json))
        } catch { /* ignore */ }
      }
    }).catch(() => {})
  }, [matchId])

  // Auto-scroll when near bottom
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null
    if (!viewport) return
    const onScroll = () => {
      isNearBottomRef.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100
    }
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.turns.length, state.isAwaitingHuman])

  useEffect(() => {
    if (state.status === 'completed') {
      setIsModalOpen(true)
    }
  }, [state.status])

  if (!matchId) return null

  const playerName = participants?.find((p) => p.role.toLowerCase() === 'player')?.name ?? 'Player'
  const dmName = participants?.find((p) => p.role.toLowerCase() === 'dm')?.name ?? 'DM'
  const isDone = state.status === 'completed' || state.status === 'error'

  // Extract last turn for canvas animation trigger
  const lastTurn = state.turns.length > 0 ? state.turns[state.turns.length - 1] : null

  useEffect(() => {
    if (!lastTurn || state.status !== 'running') return
    const checkMatch = lastTurn.content.match(/\[CHECK:\s*(\w+)\s*DC(\d+)\s*Result:\s*(\d+)\]/i)
    if (checkMatch) {
      const skill = checkMatch[1]
      const dc = parseInt(checkMatch[2], 10)
      const result = parseInt(checkMatch[3], 10)
      setActiveRoll({ skill, dc, result, success: result >= dc })
    }
  }, [lastTurn?.turn_id, state.status])

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* ── Left Sidebar: Party Roster ── */}
      <aside className="w-52 border-r border-slate-800/50 bg-slate-950/40 p-4 flex flex-col gap-4">
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 font-mono">
          &larr; Babel
        </Link>

        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mt-2">
          Party
        </h2>
        {participants ? (
          <ul className="space-y-3">
            {participants.map((p) => {
              const color = speakerColor(p.name, participants)
              const isHuman = p.model === 'human'
              
              // Determine avatar state
              let avatarStatus: 'idle' | 'thinking' | 'talking' | 'error' | 'winner' | 'loser' = 'idle'
              if (state.thinkingSpeaker?.toLowerCase() === p.name.toLowerCase()) {
                avatarStatus = 'thinking'
              } else if (state.turns.length > 0 && state.turns[state.turns.length - 1].speaker.toLowerCase() === p.name.toLowerCase()) {
                avatarStatus = 'talking'
              }
              
              return (
                <li key={p.name} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <SpriteAvatar
                      status={avatarStatus}
                      accentColor={color}
                      instanceId={p.name}
                      size={48}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-mono truncate" style={{ color }}>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {isHuman ? 'You' : p.model.split('/').pop()}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-xs text-slate-500 font-mono">Loading...</div>
        )}

        {/* Status */}
        <div className="mt-auto space-y-2">
          <div className="text-[10px] font-mono text-slate-500">
            Round {state.currentRound} {state.totalRounds > 0 ? `/ ${state.totalRounds}` : ''}
          </div>
          <div className="text-[10px] font-mono" style={{
            color: state.status === 'completed' ? '#10B981'
              : state.status === 'error' ? '#EF4444'
              : state.isAwaitingHuman ? '#10B981'
              : '#F59E0B'
          }}>
            {state.status === 'completed' ? 'Campaign complete'
              : state.status === 'error' ? 'Error'
              : state.isAwaitingHuman ? 'Your turn!'
              : state.thinkingSpeaker ? `${state.thinkingSpeaker} is thinking...`
              : 'In progress...'}
          </div>
          {isDone && state.status === 'completed' && matchId && (
            <button
              onClick={() => navigate(`/documentary/${matchId}`)}
              className="w-full text-[10px] font-mono tracking-widest uppercase px-2 py-1.5 rounded border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-colors"
            >
              Generate Recap
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content: Chat Log + Input ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Background canvas — expanding rings and vocab bursts */}
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={null}
          modelAName={dmName}
        />

        {/* Header bar */}
        <header className="h-12 border-b border-slate-800/50 flex items-center px-4 gap-3 bg-slate-950/30 relative z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-sm text-slate-300">
            RPG Session
          </span>
          <span className="font-mono text-xs text-slate-500 ml-auto">
            {matchId?.slice(0, 8)}
          </span>
        </header>

        {/* Scrolling chat log */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden relative z-10">
          <div className="p-4 space-y-1 max-w-3xl mx-auto">
            {state.turns.map((turn) => (
              <RPGTurnEntry
                key={turn.turn_id}
                turn={turn}
                color={speakerColor(turn.speaker, participants)}
              />
            ))}
            {state.thinkingSpeaker && (
              <ThinkingIndicator speaker={state.thinkingSpeaker} color="model-a" />
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Human input bar (anchored at bottom) */}
        {!isDone && (
          <HumanInput
            matchId={matchId}
            isEnabled={state.isAwaitingHuman}
            speaker={playerName}
          />
        )}

        {isDone && (
          <div className="border-t border-slate-800/50 px-4 py-3 text-center relative z-10">
            <span className="font-mono text-sm text-slate-400">
              Campaign ended.{' '}
              <Link to="/" className="text-emerald-400 hover:text-emerald-300 underline">
                Return to Babel
              </Link>
            </span>
          </div>
        )}

        <EndSessionModal
          isOpen={isModalOpen}
          matchId={matchId}
          preset={null} // Preset resolution for RPG handled via Remix route
          stats={{
            turns: state.turns.length,
            rounds: state.currentRound,
            vocab: state.vocab.length
          }}
        />

        <DiceOverlay
          roll={activeRoll}
          onComplete={() => setActiveRoll(null)}
        />
      </main>
    </div>
  )
}

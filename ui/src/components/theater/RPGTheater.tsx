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
import type { TurnEvent, ActionMenuEvent, RpgContextResponse } from '@/api/types'

/** Speaker role colors (CSS hex values) */
const ROLE_COLORS: Record<string, string> = {
  dm: '#F59E0B',       // amber
  player: '#10B981',   // emerald
  default: '#06B6D4',  // cyan (AI companions)
}

/** Role badge labels */
const ROLE_LABELS: Record<string, string> = {
  dm: 'DM',
  player: 'YOU',
  companion: 'AI',
  npc: 'NPC',
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
    <div className="animate-fade-in py-2.5">
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

/** Collapsible world state panel — NPCs, locations, items discovered so far */
function WorldStatePanel({ world }: { world: RpgContextResponse['world_state'] }) {
  const [open, setOpen] = useState(false)
  const hasData =
    (world.npcs?.length ?? 0) > 0 ||
    (world.locations?.length ?? 0) > 0 ||
    (world.items?.length ?? 0) > 0

  if (!hasData) return null

  return (
    <div className="mt-3 border border-slate-700/30 rounded overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
        style={{ background: 'rgba(15,23,42,0.6)' }}
      >
        <span>World</span>
        <span className="text-slate-600">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="px-2.5 py-2 space-y-2" style={{ background: 'rgba(15,23,42,0.4)' }}>
          {(world.npcs?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-amber-400/60 mb-1">NPCs</div>
              {world.npcs!.map((npc) => (
                <div key={npc.name} className="text-[10px] font-mono text-slate-300 truncate">
                  <span className="text-amber-300/70">{npc.name}</span>
                  {npc.status && <span className="text-slate-500"> &mdash; {npc.status}</span>}
                </div>
              ))}
            </div>
          )}
          {(world.locations?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-cyan-400/60 mb-1">Locations</div>
              {world.locations!.map((loc) => (
                <div key={loc.name} className="text-[10px] font-mono text-slate-300 truncate">
                  <span className="text-cyan-300/70">{loc.name}</span>
                </div>
              ))}
            </div>
          )}
          {(world.items?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-violet-400/60 mb-1">Items</div>
              {world.items!.map((item) => (
                <div key={item.name} className="text-[10px] font-mono text-slate-300 truncate">
                  <span className="text-violet-300/70">{item.name}</span>
                  {item.holder && <span className="text-slate-500"> ({item.holder})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** "Story So Far" banner shown at the top of the chat log when a cold summary exists */
function StorySoFarBanner({ summary }: { summary: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div
      className="mb-4 rounded px-4 py-3 relative"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(6,182,212,0.04) 100%)',
        border: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400/70">
          Previously...
        </span>
        <button
          onClick={() => setVisible(false)}
          className="text-[9px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
        >
          dismiss
        </button>
      </div>
      <p className="font-mono text-xs text-slate-300/80 leading-relaxed italic">{summary}</p>
    </div>
  )
}

/**
 * RPGTheater - full-page RPG session view.
 *
 * Layout: left sidebar (party roster + world state) + center (chat log + input).
 * Features: action menus, story-so-far banner, world state panel, campaign header.
 */
export default function RPGTheater() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { events, lastEvent } = useSSE(matchId)
  const state = useExperimentState(events)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  // Load participants from experiment record
  const [participants, setParticipants] = useState<Array<{
    name: string; model: string; role: string; char_class?: string; motivation?: string
  }> | null>(null)
  const [rpgConfig, setRpgConfig] = useState<{
    tone?: string; setting?: string; difficulty?: string; campaign_hook?: string
  } | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeRoll, setActiveRoll] = useState<{ skill: string; dc: number; result: number; success: boolean } | null>(null)

  // Action menu from backend
  const [actionMenu, setActionMenu] = useState<string[] | null>(null)

  // RPG context (cold summary + world state) — polled after round boundaries
  const [rpgContext, setRpgContext] = useState<RpgContextResponse | null>(null)

  useEffect(() => {
    if (!matchId) return
    api.getExperiment(matchId).then((exp) => {
      if (exp.participants_json) {
        try { setParticipants(JSON.parse(exp.participants_json)) } catch { /* ignore */ }
      }
      // Extract rpg_config from config_json if available
      if ((exp as Record<string, unknown>).config_json) {
        try {
          const cfg = JSON.parse((exp as Record<string, unknown>).config_json as string)
          if (cfg.rpg_config) setRpgConfig(cfg.rpg_config)
        } catch { /* ignore */ }
      }
    }).catch(() => {})
  }, [matchId])

  // Handle incoming SSE events for action menu
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'relay.action_menu') {
      setActionMenu((lastEvent as ActionMenuEvent).actions)
    } else if (lastEvent.type === 'relay.turn') {
      // Clear action menu once the player's turn is received
      const playerName = participants?.find((p) => p.role.toLowerCase() === 'player')?.name ?? ''
      if ((lastEvent as TurnEvent).speaker.toLowerCase() === playerName.toLowerCase()) {
        setActionMenu(null)
      }
    }
  }, [lastEvent, participants])

  // Fetch rpg-context after each round boundary or when turns arrive
  useEffect(() => {
    if (!matchId || state.turns.length === 0) return
    // Refresh every 2 turns (light polling — context only updates every 2 rounds anyway)
    if (state.turns.length % 2 !== 0) return
    api.getRpgContext(matchId)
      .then((ctx) => setRpgContext(ctx))
      .catch(() => {/* silent fail — context panel is cosmetic */})
  }, [matchId, state.turns.length])

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

  // Campaign tone badge color
  const toneBadgeColor: Record<string, string> = {
    cinematic: '#06B6D4',
    grimdark: '#EF4444',
    gritty: '#F97316',
    whimsical: '#A78BFA',
    serious: '#94A3B8',
  }
  const toneColor = toneBadgeColor[rpgConfig?.tone?.toLowerCase() ?? ''] ?? '#94A3B8'

  // Tone-reactive canvas tint — "R,G,B" string passed to TheaterCanvas
  const toneToTint: Record<string, string> = {
    grimdark: '239,68,68',
    gritty: '249,115,22',
    whimsical: '167,139,250',
    cinematic: '6,182,212',
    serious: '148,163,184',
  }
  const canvasTint = toneToTint[rpgConfig?.tone?.toLowerCase() ?? ''] ?? '6,182,212'

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* ── Left Sidebar: Party Roster + World State ── */}
      <aside className="w-56 border-r border-slate-800/50 bg-slate-950/40 p-4 flex flex-col gap-4 overflow-y-auto">
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 font-mono flex-shrink-0">
          &larr; Babel
        </Link>

        {/* Campaign info */}
        {rpgConfig && (
          <div className="flex-shrink-0 space-y-1">
            {rpgConfig.tone && (
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{ color: toneColor, border: `1px solid ${toneColor}40`, background: `${toneColor}10` }}
                >
                  {rpgConfig.tone}
                </span>
                {rpgConfig.setting && (
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide truncate">
                    {rpgConfig.setting}
                  </span>
                )}
              </div>
            )}
            {rpgConfig.campaign_hook && (
              <p className="text-[10px] font-mono text-slate-400/70 leading-snug line-clamp-3 italic">
                {rpgConfig.campaign_hook}
              </p>
            )}
          </div>
        )}

        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex-shrink-0">
          Party
        </h2>

        {participants ? (
          <ul className="space-y-3 flex-shrink-0">
            {participants.map((p) => {
              const color = speakerColor(p.name, participants)
              const isHuman = p.model === 'human'
              const role = p.role.toLowerCase()
              const roleLabel = ROLE_LABELS[role] ?? role.toUpperCase()

              let avatarStatus: 'idle' | 'thinking' | 'talking' | 'error' | 'winner' | 'loser' = 'idle'
              if (state.thinkingSpeaker?.toLowerCase() === p.name.toLowerCase()) {
                avatarStatus = 'thinking'
              } else if (state.turns.length > 0 && state.turns[state.turns.length - 1].speaker.toLowerCase() === p.name.toLowerCase()) {
                avatarStatus = 'talking'
              }

              const isAwaiting = isHuman && state.isAwaitingHuman
              return (
                <li key={p.name} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-0.5 relative">
                    {isAwaiting && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: 'rgba(16,185,129,0.3)' }}
                      />
                    )}
                    <SpriteAvatar
                      status={avatarStatus}
                      accentColor={color}
                      instanceId={p.name}
                      size={40}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-medium truncate" style={{ color }}>
                        {p.name}
                      </span>
                      <span
                        className="text-[8px] font-mono px-1 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: `${color}cc`,
                          border: `1px solid ${color}30`,
                          background: `${color}10`,
                        }}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    {p.char_class && (
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {p.char_class}
                      </div>
                    )}
                    <div className="text-[9px] text-slate-600 font-mono truncate">
                      {isHuman ? 'Human player' : p.model.split('/').pop()}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-xs text-slate-500 font-mono">Loading...</div>
        )}

        {/* World state entities panel */}
        {rpgContext?.world_state && (
          <WorldStatePanel world={rpgContext.world_state} />
        )}

        {/* Status + actions */}
        <div className="mt-auto space-y-2 flex-shrink-0">
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
        {/* Background canvas */}
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={null}
          modelAName={dmName}
          tintColor={canvasTint}
        />

        {/* Header bar */}
        <header className="h-12 border-b border-slate-800/50 flex items-center px-4 gap-3 bg-slate-950/30 relative z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-sm text-slate-300">
            RPG Session
          </span>
          {rpgConfig?.setting && (
            <span className="font-mono text-xs text-slate-500 hidden sm:block">
              &mdash; {rpgConfig.setting}
            </span>
          )}
          <span className="font-mono text-xs text-slate-600 ml-auto tabular-nums">
            {matchId?.slice(0, 8)}
          </span>
        </header>

        {/* Scrolling chat log */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden relative z-10">
          <div className="p-4 space-y-1 max-w-3xl mx-auto">
            {/* Story So Far banner (shows once cold summary is available) */}
            {rpgContext?.cold_summary && state.turns.length > 0 && (
              <StorySoFarBanner summary={rpgContext.cold_summary} />
            )}

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
            actionMenu={actionMenu}
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
          preset={null}
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

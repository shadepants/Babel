import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
import { ProviderSigil } from '@/components/common/ProviderSigil'
import type { TurnEvent, ActionMenuEvent, RpgContextResponse } from '@/api/types'

// -- Color system ------------------------------------------------------------

/** DM always amber, human player always emerald, companions get unique palette colors */
const COMPANION_PALETTE = ['#A78BFA', '#F472B6', '#38BDF8', '#FB923C']

type Participant = {
  name: string
  model: string
  role: string
  char_class?: string
  motivation?: string
}

function buildColorMap(participants: Participant[] | null): Record<string, string> {
  if (!participants) return {}
  const map: Record<string, string> = {}
  let ci = 0
  for (const p of participants) {
    const role = p.role.toLowerCase()
    if (role === 'dm') {
      map[p.name.toLowerCase()] = '#F59E0B'
    } else if (role === 'player') {
      map[p.name.toLowerCase()] = '#10B981'
    } else {
      map[p.name.toLowerCase()] = COMPANION_PALETTE[ci % COMPANION_PALETTE.length]
      ci++
    }
  }
  return map
}

const ROLE_LABELS: Record<string, string> = {
  dm: 'DM',
  player: 'YOU',
  companion: 'AI',
  npc: 'NPC',
}

// -- Turn entry components ---------------------------------------------------

/**
 * DM turn -- full-width narrative prose format.
 * Italic, wider left border, strip [CHECK: ...] tags (dice overlay handles those).
 */
function DMTurnEntry({ turn, color }: { turn: TurnEvent; color: string }) {
  const displayContent = turn.content.replace(/\[CHECK:[^\]]*\]/gi, '').trim()

  return (
    <div className="animate-fade-in py-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: color }} />
        <span
          className="font-mono text-[9px] uppercase tracking-widest font-bold"
          style={{ color }}
        >
          Dungeon Master
        </span>
        <span className="font-mono text-[9px] text-text-dim/40 ml-auto tabular-nums">
          R.{turn.round}{turn.latency_s ? <> &middot; {turn.latency_s}s</> : null}
        </span>
      </div>

      <div
        className="text-sm leading-7 whitespace-pre-wrap break-words"
        style={{
          color: 'rgba(255,255,255,0.88)',
          fontFamily: 'ui-monospace, monospace',
          fontStyle: 'italic',
          borderLeft: `3px solid ${color}50`,
          paddingLeft: '16px',
        }}
      >
        {displayContent}
      </div>

      <div
        className="mt-4 h-px"
        style={{ background: `linear-gradient(90deg, ${color}25, transparent 60%)` }}
      />
    </div>
  )
}

/**
 * Companion / player turn -- character card format.
 * Shows name + class + model sigil in header, content with colored left border.
 */
function CompanionTurnEntry({
  turn,
  color,
  participant,
}: {
  turn: TurnEvent
  color: string
  participant?: Participant
}) {
  const isPlayer = participant?.role.toLowerCase() === 'player'

  return (
    <div className="animate-fade-in py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-mono text-xs font-semibold" style={{ color }}>
          {turn.speaker}
        </span>

        {participant?.char_class && (
          <span
            className="font-mono text-[9px] uppercase tracking-wide"
            style={{ color: `${color}80` }}
          >
            {participant.char_class}
          </span>
        )}

        {!isPlayer && participant?.model && (
          <span className="flex items-center gap-1 ml-1" style={{ color: `${color}60` }}>
            <ProviderSigil model={participant.model} size={10} color={`${color}60`} />
            <span className="font-mono text-[9px]">
              {participant.model.split('/').pop()}
            </span>
          </span>
        )}

        <span className="font-mono text-[9px] text-text-dim/30 ml-auto tabular-nums">
          R.{turn.round}{turn.latency_s ? <> &middot; {turn.latency_s}s</> : null}
        </span>
      </div>

      <div
        className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          color: 'rgba(255,255,255,0.80)',
          borderLeft: `2px solid ${color}40`,
          paddingLeft: '12px',
        }}
      >
        {turn.content}
      </div>
    </div>
  )
}

// -- Narrative arc bar -------------------------------------------------------

const ARC_PHASES = [
  { label: 'Opening', from: 0 },
  { label: 'Rising Action', from: 0.2 },
  { label: 'Climax', from: 0.6 },
  { label: 'Resolution', from: 0.85 },
]

/** Horizontal story arc indicator -- shows current phase + round progress. */
function NarrativeArcBar({ current, total }: { current: number; total: number }) {
  if (!total || total < 2) return null

  const progress = Math.min(current / total, 1)
  let activeLabel = ARC_PHASES[0].label
  for (const ph of ARC_PHASES) {
    if (progress >= ph.from) activeLabel = ph.label
  }

  return (
    <div
      className="px-4 py-2 border-b border-border-custom/20 flex items-center gap-3 relative z-10"
      style={{ background: 'rgba(10,15,30,0.4)' }}
    >
      <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim/50 w-28 flex-shrink-0">
        {activeLabel}
      </span>
      <div
        className="flex-1 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #F59E0B, #A78BFA)',
          }}
        />
      </div>
      <span className="font-mono text-[9px] text-text-dim/40 flex-shrink-0 tabular-nums">
        R.{current} / {total}
      </span>
    </div>
  )
}

// -- World state panel -------------------------------------------------------

/**
 * World state sidebar panel.
 * Defaults open (observatory mode). New entities pulse gold on discovery.
 */
function WorldStatePanel({ world }: { world: RpgContextResponse['world_state'] }) {
  const [open, setOpen] = useState(true)
  const [freshNames, setFreshNames] = useState<Set<string>>(new Set())
  const knownRef = useRef<Set<string>>(new Set())

  const hasData =
    (world.npcs?.length ?? 0) > 0 ||
    (world.locations?.length ?? 0) > 0 ||
    (world.items?.length ?? 0) > 0

  useEffect(() => {
    const all = [
      ...(world.npcs?.map((n) => n.name) ?? []),
      ...(world.locations?.map((l) => l.name) ?? []),
      ...(world.items?.map((i) => i.name) ?? []),
    ]
    const fresh = new Set(all.filter((n) => !knownRef.current.has(n)))
    all.forEach((n) => knownRef.current.add(n))

    if (fresh.size > 0) {
      setFreshNames(fresh)
      const t = setTimeout(() => setFreshNames(new Set()), 2500)
      return () => clearTimeout(t)
    }
  }, [world])

  if (!hasData) return null

  return (
    <div className="mt-3 border border-border-custom/30 rounded overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-primary transition-colors"
        style={{ background: 'rgba(15,23,42,0.6)' }}
      >
        <span>World</span>
        <span className="text-text-dim/60">{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div className="px-2.5 py-2 space-y-2" style={{ background: 'rgba(15,23,42,0.4)' }}>
          {(world.npcs?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-amber-400/60 mb-1">NPCs</div>
              {world.npcs!.map((npc) => (
                <div
                  key={npc.name}
                  className="text-[10px] font-mono truncate transition-colors duration-700"
                  style={{ color: freshNames.has(npc.name) ? '#FCD34D' : 'rgba(253,230,138,0.7)' }}
                >
                  {npc.name}
                  {npc.status && (
                    <span className="text-text-dim"> &mdash; {npc.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {(world.locations?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-cyan-400/60 mb-1">Locations</div>
              {world.locations!.map((loc) => (
                <div
                  key={loc.name}
                  className="text-[10px] font-mono truncate transition-colors duration-700"
                  style={{ color: freshNames.has(loc.name) ? '#67E8F9' : 'rgba(103,232,249,0.7)' }}
                >
                  {loc.name}
                </div>
              ))}
            </div>
          )}

          {(world.items?.length ?? 0) > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase text-violet-400/60 mb-1">Items</div>
              {world.items!.map((item) => (
                <div
                  key={item.name}
                  className="text-[10px] font-mono truncate transition-colors duration-700"
                  style={{ color: freshNames.has(item.name) ? '#C4B5FD' : 'rgba(167,139,250,0.7)' }}
                >
                  {item.name}
                  {item.holder && (
                    <span className="text-text-dim"> ({item.holder})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// -- Story so far banner -----------------------------------------------------

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
          className="text-[9px] font-mono text-text-dim/60 hover:text-text-dim transition-colors"
        >
          dismiss
        </button>
      </div>
      <p className="font-mono text-xs text-text-primary/70 leading-relaxed italic">{summary}</p>
    </div>
  )
}

// -- Main component ----------------------------------------------------------

/**
 * RPGTheater -- AI vs AI RPG session observatory.
 *
 * Pure observation mode: each participant gets a unique color, DM turns render
 * as narrative prose, companions as character cards. Narrative arc bar shows
 * story phase. Observer status bar replaces human input for pure AI sessions.
 */
export default function RPGTheater() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { events, lastEvent } = useSSE(matchId)
  const state = useExperimentState(events)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const [participants, setParticipants] = useState<Participant[] | null>(null)
  const [rpgConfig, setRpgConfig] = useState<{
    tone?: string; setting?: string; difficulty?: string; campaign_hook?: string
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeRoll, setActiveRoll] = useState<{
    skill: string; dc: number; result: number; success: boolean
  } | null>(null)
  const [actionMenu, setActionMenu] = useState<string[] | null>(null)
  const [rpgContext, setRpgContext] = useState<RpgContextResponse | null>(null)

  // Derived
  const colorMap = useMemo(() => buildColorMap(participants), [participants])
  const hasHumanPlayer = useMemo(
    () => participants?.some((p) => p.model === 'human') ?? false,
    [participants]
  )

  // BUG 7 fix: stable callback for DiceOverlay to avoid a new function on every render
  const handleRollComplete = useCallback(() => setActiveRoll(null), [])

  // Load experiment metadata
  useEffect(() => {
    if (!matchId) return
    api.getExperiment(matchId).then((exp) => {
      if (exp.participants_json) {
        try { setParticipants(JSON.parse(exp.participants_json)) } catch { /* ignore */ }
      }
      // config_json is present at runtime but not in ExperimentRecord type -- added in a later migration
      if ((exp as Record<string, unknown>).config_json) {
        try {
          const cfg = JSON.parse((exp as Record<string, unknown>).config_json as string)
          if (cfg.rpg_config) setRpgConfig(cfg.rpg_config)
        } catch { /* ignore */ }
      }
    }).catch(() => {})
  }, [matchId])

  // Action menu events
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'relay.action_menu') {
      setActionMenu((lastEvent as ActionMenuEvent).actions)
    } else if (lastEvent.type === 'relay.turn') {
      const playerName = participants?.find((p) => p.role.toLowerCase() === 'player')?.name ?? ''
      if ((lastEvent as TurnEvent).speaker.toLowerCase() === playerName.toLowerCase()) {
        setActionMenu(null)
      }
    }
  }, [lastEvent, participants])

  // RPG context polling -- every 2 turns
  useEffect(() => {
    if (!matchId || state.turns.length === 0) return
    if (state.turns.length % 2 !== 0) return
    api.getRpgContext(matchId)
      .then((ctx) => setRpgContext(ctx))
      .catch(() => {})
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
    if (state.status === 'completed') setIsModalOpen(true)
  }, [state.status])

  // Detect [CHECK: Skill DC# Result: #] in the latest DM turn
  const lastTurn = state.turns.length > 0 ? state.turns[state.turns.length - 1] : null
  useEffect(() => {
    if (!lastTurn || state.status !== 'running') return
    const m = lastTurn.content.match(/\[CHECK:\s*(\w+)\s*DC(\d+)\s*Result:\s*(\d+)\]/i)
    if (m) {
      const skill = m[1]
      const dc = parseInt(m[2], 10)
      const result = parseInt(m[3], 10)
      setActiveRoll({ skill, dc, result, success: result >= dc })
    }
  }, [lastTurn?.turn_id, state.status])

  if (!matchId) return null

  const playerName = participants?.find((p) => p.role.toLowerCase() === 'player')?.name ?? 'Player'
  const dmName = participants?.find((p) => p.role.toLowerCase() === 'dm')?.name ?? 'DM'
  const isDone = state.status === 'completed' || state.status === 'error'

  // Tone visuals
  const toneBadgeColor: Record<string, string> = {
    cinematic: '#06B6D4', grimdark: '#EF4444', gritty: '#F97316',
    whimsical: '#A78BFA', serious: '#94A3B8',
  }
  const toneColor = toneBadgeColor[rpgConfig?.tone?.toLowerCase() ?? ''] ?? '#94A3B8'

  const toneToTint: Record<string, string> = {
    grimdark: '239,68,68', gritty: '249,115,22', whimsical: '167,139,250',
    cinematic: '6,182,212', serious: '148,163,184',
  }
  const canvasTint = toneToTint[rpgConfig?.tone?.toLowerCase() ?? ''] ?? '6,182,212'

  // BUG 6 fix: derive ThinkingIndicator color from the speaker's role.
  // DM maps to 'model-a' (amber); all other speakers map to 'model-b'.
  const thinkingColor: 'model-a' | 'model-b' =
    participants?.find(
      (p) => p.name.toLowerCase() === state.thinkingSpeaker?.toLowerCase()
    )?.role.toLowerCase() === 'dm'
      ? 'model-a'
      : 'model-b'

  return (
    // BUG 5 fix: replaced h-screen with flex-1 overflow-hidden so the component
    // fills the remaining space inside Layout without overflowing past the nav bar.
    <div className="flex flex-1 overflow-hidden bg-bg-primary text-text-primary">

      {/* -- Left Sidebar: Party Roster + World State -- */}
      <aside className="w-56 border-r border-border-custom/50 bg-bg-deep/40 p-4 flex flex-col gap-4 overflow-y-auto">
        <Link
          to="/"
          className="text-xs text-text-dim hover:text-text-primary/80 font-mono flex-shrink-0"
        >
          &larr; Babel
        </Link>

        {/* Campaign info */}
        {rpgConfig && (
          <div className="flex-shrink-0 space-y-1.5">
            {rpgConfig.tone && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{
                    color: toneColor,
                    border: `1px solid ${toneColor}40`,
                    background: `${toneColor}10`,
                  }}
                >
                  {rpgConfig.tone}
                </span>
                {rpgConfig.setting && (
                  <span className="text-[9px] font-mono text-text-dim uppercase tracking-wide truncate">
                    {rpgConfig.setting}
                  </span>
                )}
              </div>
            )}
            {rpgConfig.campaign_hook && (
              <p className="text-[10px] font-mono text-text-dim/70 leading-snug line-clamp-3 italic">
                {rpgConfig.campaign_hook}
              </p>
            )}
          </div>
        )}

        <h2 className="text-xs font-mono uppercase tracking-wider text-text-dim flex-shrink-0">
          Party
        </h2>

        {participants ? (
          <ul className="space-y-3 flex-shrink-0">
            {participants.map((p) => {
              const color = colorMap[p.name.toLowerCase()] ?? '#06B6D4'
              const isHuman = p.model === 'human'
              const role = p.role.toLowerCase()
              const roleLabel = ROLE_LABELS[role] ?? role.toUpperCase()

              let avatarStatus: 'idle' | 'thinking' | 'talking' | 'error' | 'winner' | 'loser' = 'idle'
              if (state.thinkingSpeaker?.toLowerCase() === p.name.toLowerCase()) {
                avatarStatus = 'thinking'
              } else if (
                state.turns.length > 0 &&
                state.turns[state.turns.length - 1].speaker.toLowerCase() === p.name.toLowerCase()
              ) {
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
                      <span
                        className="text-sm font-mono font-medium truncate"
                        style={{ color }}
                      >
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
                      <div className="text-[10px] font-mono text-text-dim truncate">
                        {p.char_class}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[9px] text-text-dim/60 font-mono">
                      {!isHuman && (
                        <ProviderSigil model={p.model} size={9} color="rgba(148,163,184,0.5)" />
                      )}
                      <span className="truncate">
                        {isHuman ? 'Human player' : p.model.split('/').pop()}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-xs text-text-dim font-mono">Loading...</div>
        )}

        {/* World state panel */}
        {rpgContext?.world_state && (
          <WorldStatePanel world={rpgContext.world_state} />
        )}

        {/* Status + recap button */}
        <div className="mt-auto space-y-2 flex-shrink-0">
          <div className="text-[10px] font-mono text-text-dim">
            Round {state.currentRound}{state.totalRounds > 0 ? ` / ${state.totalRounds}` : ''}
          </div>
          <div
            className="text-[10px] font-mono"
            style={{
              color: state.status === 'completed' ? '#10B981'
                : state.status === 'error' ? '#EF4444'
                : state.isAwaitingHuman ? '#10B981'
                : '#F59E0B',
            }}
          >
            {state.status === 'completed' ? 'Campaign complete'
              : state.status === 'error' ? (state.errorMessage || 'Error')
              : state.isAwaitingHuman ? 'Your turn!'
              : state.thinkingSpeaker ? `${state.thinkingSpeaker} thinking...`
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

      {/* -- Main: Story Feed + Status Bar -- */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <TheaterCanvas
          lastTurn={lastTurn}
          lastVocab={null}
          modelAName={dmName}
          tintColor={canvasTint}
        />

        {/* Header */}
        <header
          className="h-12 border-b border-border-custom/50 flex items-center px-4 gap-3 relative z-10"
          style={{ background: 'rgba(10,15,30,0.4)' }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-sm text-text-primary/80">RPG Session</span>
          {rpgConfig?.setting && (
            <span className="font-mono text-xs text-text-dim hidden sm:block">
              &mdash; {rpgConfig.setting}
            </span>
          )}
          <span className="font-mono text-xs text-text-dim/60 ml-auto tabular-nums">
            {matchId?.slice(0, 8)}
          </span>
        </header>

        {/* Narrative arc bar */}
        <NarrativeArcBar current={state.currentRound} total={state.totalRounds} />

        {/* Story feed */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden relative z-10">
          <div className="p-6 space-y-0.5 max-w-3xl mx-auto">
            {rpgContext?.cold_summary && state.turns.length > 0 && (
              <StorySoFarBanner summary={rpgContext.cold_summary} />
            )}

            {state.turns.map((turn) => {
              const color = colorMap[turn.speaker.toLowerCase()] ?? '#06B6D4'
              const participant = participants?.find(
                (p) => p.name.toLowerCase() === turn.speaker.toLowerCase()
              )
              const isDM = participant?.role.toLowerCase() === 'dm'

              return isDM
                ? <DMTurnEntry key={turn.turn_id} turn={turn} color={color} />
                : <CompanionTurnEntry key={turn.turn_id} turn={turn} color={color} participant={participant} />
            })}

            {state.thinkingSpeaker && (
              <div className="py-2">
                <ThinkingIndicator speaker={state.thinkingSpeaker} color={thinkingColor} />
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Bottom bar */}
        {!isDone && hasHumanPlayer && (
          <HumanInput
            matchId={matchId}
            isEnabled={state.isAwaitingHuman}
            speaker={playerName}
            actionMenu={actionMenu}
          />
        )}

        {/* Observer status bar -- pure AI session */}
        {!isDone && !hasHumanPlayer && (
          <div
            className="border-t flex items-center gap-3 px-4 py-2.5 relative z-10"
            style={{
              borderColor: 'rgba(100,116,139,0.12)',
              background: 'rgba(10,15,30,0.6)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: state.thinkingSpeaker ? '#F59E0B' : '#10B981',
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }}
            />
            <span className="font-mono text-xs text-text-dim">
              {state.thinkingSpeaker
                ? `${state.thinkingSpeaker} composing...`
                : state.status === 'running'
                ? 'Observing live session'
                : 'Session active'}
            </span>
          </div>
        )}

        {isDone && (
          <div className="border-t border-border-custom/50 px-4 py-3 text-center relative z-10">
            <span className="font-mono text-sm text-text-dim">
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
            vocab: state.vocab.length,
          }}
        />

        <DiceOverlay roll={activeRoll} onComplete={handleRollComplete} />
      </main>
    </div>
  )
}

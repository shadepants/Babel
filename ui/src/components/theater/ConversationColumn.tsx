import { useEffect, useRef } from 'react'
import type { TurnEvent, ScoreEvent, VocabEvent } from '@/api/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TurnBubble } from './TurnBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { RoundDivider } from './RoundDivider'
import { cn } from '@/lib/utils'

/** Phase 15-A: palette for up to 4 agents (amber / cyan / emerald / violet) */
export const AGENT_COLORS = ['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6']

interface ConversationColumnProps {
  speakerName: string
  turns: TurnEvent[]
  thinkingSpeaker: string | null
  /** Which agent slot this column represents (0-3). Drives dynamic color. */
  agentIndex: number
  /** @deprecated pass agentIndex instead; kept for backward compat with TurnBubble */
  color?: 'model-a' | 'model-b'
  scores?: Record<string | number, ScoreEvent>
  /** turn_id of the most recent turn -- enables typewriter effect on that bubble */
  latestTurnId?: string | null
  /** Vocab events for inline word linking */
  vocab?: VocabEvent[]
  /** Experiment ID for dictionary deep links */
  experimentId?: string
}

/**
 * One column of the split/multi-agent conversation view.
 * Filters turns to show only this speaker's messages,
 * with round dividers and auto-scroll.
 * When thinking: border and header glow in agent color.
 */
export function ConversationColumn({
  speakerName,
  turns,
  thinkingSpeaker,
  agentIndex,
  color,
  scores,
  latestTurnId,
  vocab,
  experimentId,
}: ConversationColumnProps) {
  const bottomRef     = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const myTurns  = turns.filter((t) => t.speaker === speakerName)
  const isThinking = thinkingSpeaker === speakerName

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
  }, [myTurns.length, isThinking])

  // Dynamic color from agentIndex; fall back to legacy color prop derivation
  const agentColor = AGENT_COLORS[agentIndex] ?? (color === 'model-b' ? '#06B6D4' : '#F59E0B')
  // TurnBubble still needs the 2-value union; map index 1 to model-b, everything else to model-a
  const bubbleColor: 'model-a' | 'model-b' = agentIndex === 1 ? 'model-b' : 'model-a'

  const borderStyle = isThinking
    ? { borderColor: agentColor + 'aa' }
    : { borderColor: agentColor + '26' }

  const glowShadow = isThinking
    ? `0 0 18px ${agentColor}4d, inset 0 0 24px ${agentColor}0a`
    : undefined

  const topBarGradient = isThinking
    ? `linear-gradient(90deg, ${agentColor}, transparent)`
    : `linear-gradient(90deg, ${agentColor}4d, transparent)`

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-sm bg-bg-card/35 backdrop-blur-sm transition-all duration-700',
        agentIndex === 0 ? 'model-a' : agentIndex === 1 ? 'model-b' : '',
      )}
      style={{ boxShadow: glowShadow, ...borderStyle }}
      data-agent-index={agentIndex}
    >
      {/* Colored top bar -- glow matches agent color */}
      <div
        className="h-0.5 rounded-t-sm transition-all duration-500"
        style={{ background: topBarGradient }}
      />

      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden" aria-live="polite" aria-atomic="false">
        <div className="p-3 space-y-2.5">
          {myTurns.map((turn, i) => {
            const prevRound = i > 0 ? myTurns[i - 1].round : 0
            const showDivider = turn.round > prevRound && i > 0
            return (
              <div key={turn.turn_id}>
                {showDivider && <RoundDivider round={turn.round} />}
                <TurnBubble
                  turn={turn}
                  color={bubbleColor}
                  accentColor={agentColor}
                  score={scores?.[turn.turn_id]}
                  isLatest={turn.turn_id === latestTurnId}
                  vocab={vocab}
                  experimentId={experimentId}
                />
              </div>
            )
          })}
          {isThinking && <ThinkingIndicator speaker={speakerName} color={bubbleColor} />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

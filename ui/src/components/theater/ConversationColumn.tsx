import { useEffect, useRef } from 'react'
import type { TurnEvent, ScoreEvent, VocabEvent } from '@/api/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TurnBubble } from './TurnBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import { RoundDivider } from './RoundDivider'
import { cn } from '@/lib/utils'

interface ConversationColumnProps {
  speakerName: string
  turns: TurnEvent[]
  thinkingSpeaker: string | null
  color: 'model-a' | 'model-b'
  scores?: Record<number, ScoreEvent>
  /** turn_id of the most recent turn — enables typewriter effect on that bubble */
  latestTurnId?: string | null
  /** Vocab events for inline word linking */
  vocab?: VocabEvent[]
  /** Experiment ID for dictionary deep links */
  experimentId?: string
}

/**
 * One side of the split conversation view.
 * Filters turns to show only this speaker's messages,
 * with round dividers and auto-scroll.
 * When thinking: border and header glow in model color.
 */
export function ConversationColumn({
  speakerName,
  turns,
  thinkingSpeaker,
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

  const isA = color === 'model-a'

  const borderColor = isA
    ? isThinking ? 'border-model-a/60' : 'border-model-a/15'
    : isThinking ? 'border-model-b/60' : 'border-model-b/15'

  const glowShadow = isThinking
    ? isA
      ? '0 0 18px rgba(245,158,11,0.3), inset 0 0 24px rgba(245,158,11,0.04)'
      : '0 0 18px rgba(6,182,212,0.3), inset 0 0 24px rgba(6,182,212,0.04)'
    : undefined

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-sm bg-bg-card/35 backdrop-blur-sm transition-all duration-700',
        borderColor,
      )}
      style={{ boxShadow: glowShadow }}
    >
      {/* Minimal colored top bar replaces full header — ArenaStage shows names */}
      <div
        className="h-0.5 rounded-t-sm transition-all duration-500"
        style={{
          background: isThinking
            ? `linear-gradient(90deg, ${isA ? '#F59E0B' : '#06B6D4'}, transparent)`
            : `linear-gradient(90deg, ${isA ? 'rgba(245,158,11,0.3)' : 'rgba(6,182,212,0.3)'}, transparent)`,
        }}
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
                  color={color}
                  score={scores?.[turn.turn_id]}
                  isLatest={turn.turn_id === latestTurnId}
                  vocab={vocab}
                  experimentId={experimentId}
                />
              </div>
            )
          })}
          {isThinking && <ThinkingIndicator speaker={speakerName} color={color} />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

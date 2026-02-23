import { useEffect, useRef } from 'react'
import type { TurnEvent, ScoreEvent } from '@/api/types'
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
}: ConversationColumnProps) {
  const bottomRef     = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const myTurns  = turns.filter((t) => t.speaker === speakerName)
  const isThinking = thinkingSpeaker === speakerName

  // Scroll listener on Radix's internal viewport
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
  const headerColor = isA ? 'text-model-a' : 'text-model-b'

  // Border: brighter + glowing when this model is thinking, dimmer otherwise
  const borderColor = isA
    ? isThinking ? 'border-model-a/70' : 'border-model-a/20'
    : isThinking ? 'border-model-b/70' : 'border-model-b/20'

  // Glow shadow: pulses on when thinking
  const glowShadow = isThinking
    ? isA
      ? '0 0 20px rgba(245, 158, 11, 0.35), inset 0 0 30px rgba(245, 158, 11, 0.05)'
      : '0 0 20px rgba(6, 182, 212, 0.35), inset 0 0 30px rgba(6, 182, 212, 0.05)'
    : undefined

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-lg bg-bg-card/40 backdrop-blur-sm transition-all duration-700',
        borderColor,
      )}
      style={{ boxShadow: glowShadow }}
    >
      {/* Column header — glows in model color when thinking */}
      <div className={cn(
        'px-4 py-3 border-b transition-colors duration-700',
        isThinking ? (isA ? 'border-model-a/40' : 'border-model-b/40') : 'border-border-custom',
      )}>
        <h3 className={cn('text-sm font-semibold transition-all duration-500', headerColor, isThinking && 'brightness-125')}>
          {speakerName}
        </h3>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden" aria-live="polite" aria-atomic="false">
        <div className="p-3 space-y-3">
          {myTurns.map((turn, i) => {
            const prevRound = i > 0 ? myTurns[i - 1].round : 0
            const showDivider = turn.round > prevRound && i > 0
            return (
              <div key={turn.turn_id}>
                {showDivider && <RoundDivider round={turn.round} />}
                <TurnBubble turn={turn} color={color} score={scores?.[turn.turn_id]} />
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

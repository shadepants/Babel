import { useEffect, useRef } from 'react'
import type { TurnEvent } from '@/api/types'
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
}

/**
 * One side of the split conversation view.
 * Filters turns to show only this speaker's messages,
 * with round dividers and auto-scroll.
 */
export function ConversationColumn({
  speakerName,
  turns,
  thinkingSpeaker,
  color,
}: ConversationColumnProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const myTurns = turns.filter((t) => t.speaker === speakerName)
  const isThinking = thinkingSpeaker === speakerName

  // Attach a scroll listener to Radix's internal viewport element,
  // which is the actual scrollable container (has overflow: scroll).
  // The outer ScrollArea Root doesn't scroll, so onScrollCapture there
  // would always see scrollHeight === clientHeight.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null
    if (!viewport) return

    const onScroll = () => {
      const threshold = 100
      isNearBottomRef.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold
    }
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [])

  // Only auto-scroll if the user is already near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [myTurns.length, isThinking])

  const headerColor = color === 'model-a' ? 'text-model-a' : 'text-model-b'
  const borderColor = color === 'model-a' ? 'border-model-a/20' : 'border-model-b/20'

  return (
    <div className={cn('flex flex-col h-full border rounded-lg bg-bg-deep/50', borderColor)}>
      {/* Column header */}
      <div className="px-4 py-3 border-b border-border-custom">
        <h3 className={cn('text-sm font-semibold', headerColor)}>
          {speakerName}
        </h3>
      </div>

      {/* Scrollable turn list */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden" aria-live="polite" aria-atomic="false">
        <div className="p-3 space-y-3">
          {myTurns.map((turn, i) => {
            // Show round divider when round number changes
            const prevRound = i > 0 ? myTurns[i - 1].round : 0
            const showDivider = turn.round > prevRound && i > 0

            return (
              <div key={turn.turn_id}>
                {showDivider && <RoundDivider round={turn.round} />}
                <TurnBubble turn={turn} color={color} />
              </div>
            )
          })}

          {isThinking && (
            <ThinkingIndicator speaker={speakerName} color={color} />
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

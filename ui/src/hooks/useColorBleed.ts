import { useEffect } from 'react'
import { AGENT_COLORS } from '@/components/theater/ConversationColumn'
import type { TurnEvent } from '@/api/types'
import type { AgentSlot } from './useTheaterData'

const COLOR_DEFAULT = '#8b5cf6'

/**
 * Applies CSS variable + data-attribute color bleed to document.documentElement
 * based on the currently speaking agent.
 *
 * Sets:
 *   --color-active   CSS variable (hex color string)
 *   data-active-model attribute ('a' | 'b')
 *
 * Cleans up on unmount by resetting both to their defaults.
 *
 * @param thinkingSpeaker - Name of the agent currently generating (from SSE state).
 * @param effectiveTurns  - Merged turn list (SSE + DB fallback) for last-speaker fallback.
 * @param agentSlots      - Ordered agent slot list used to map names to indices/colors.
 */
export function useColorBleed(
  thinkingSpeaker: string | null,
  effectiveTurns: TurnEvent[],
  agentSlots: AgentSlot[],
): void {
  // Active color bleed: update whenever the thinking speaker or turn list changes
  useEffect(() => {
    const root = document.documentElement
    const activeIdx = agentSlots.findIndex(s => s.name === thinkingSpeaker)
    if (activeIdx >= 0) {
      root.setAttribute('data-active-model', activeIdx === 0 ? 'a' : 'b')
      root.style.setProperty('--color-active', AGENT_COLORS[activeIdx] ?? COLOR_DEFAULT)
    } else if (effectiveTurns.length > 0) {
      const last = effectiveTurns[effectiveTurns.length - 1]
      const lastIdx = agentSlots.findIndex(s => s.name === last.speaker)
      if (lastIdx >= 0) {
        root.setAttribute('data-active-model', lastIdx === 0 ? 'a' : 'b')
        root.style.setProperty('--color-active', AGENT_COLORS[lastIdx] ?? COLOR_DEFAULT)
      }
    }
  }, [thinkingSpeaker, effectiveTurns, agentSlots])

  // Cleanup: reset CSS variables when Theater unmounts
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-active-model')
      document.documentElement.style.setProperty('--color-active', COLOR_DEFAULT)
    }
  }, [])
}

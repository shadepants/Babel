/**
 * Sprite status derivation helpers.
 * Centralises winner/loser/error/idle resolution so Gallery, Analytics,
 * and Theater all use the same rules.
 */

import type { SpriteStatus } from '@/components/theater/SpriteAvatar'

/**
 * Derive sprite outcome states for a standard 2-agent experiment.
 * Uses the experiment's `winner` and `status` fields.
 * Returns an `{ a, b }` pair where `a` is agent 0 (model_a / agent_0)
 * and `b` is agent 1 (model_b / agent_1).
 */
export function resolveSpritePair(
  winner: string | null | undefined,
  status: string,
): { a: SpriteStatus; b: SpriteStatus } {
  if (status === 'failed' || status === 'error') return { a: 'error', b: 'error' }
  if (winner === 'model_a' || winner === 'agent_0') return { a: 'winner', b: 'loser' }
  if (winner === 'model_b' || winner === 'agent_1') return { a: 'loser', b: 'winner' }
  if (winner === 'tie') return { a: 'idle', b: 'idle' }
  return { a: 'idle', b: 'idle' }
}

/**
 * Resolve a winner string to an agent index (0-based).
 * Handles both new-style ("agent_0", "agent_1") and legacy ("model_a", "model_b").
 * Returns null for ties or unrecognised strings.
 */
export function resolveWinnerIndex(winner: string): number | null {
  if (winner === 'tie') return null
  const m = winner.match(/^agent_(\d+)$/)
  if (m) return parseInt(m[1], 10)
  if (winner === 'model_a') return 0
  if (winner === 'model_b') return 1
  return null
}

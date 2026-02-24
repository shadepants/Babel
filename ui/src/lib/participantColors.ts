/**
 * N-participant color palette for Babel.
 *
 * Index 0 = amber (model A), index 1 = cyan (model B) — matches the existing
 * tailwind model-a / model-b tokens and SpriteAvatar colors.
 * Indices 2+ extend the palette for RPG mode (DM + multiple players).
 */
export const PARTICIPANT_PALETTE: string[] = [
  '#F59E0B', // amber   — participant 0 / model A
  '#06B6D4', // cyan    — participant 1 / model B
  '#8b5cf6', // violet  — participant 2
  '#10b981', // emerald — participant 3
  '#f97316', // orange  — participant 4
  '#ec4899', // pink    — participant 5
]

/** Get a stable color for participant index i (wraps for i >= 6). */
export function getParticipantColor(index: number): string {
  return PARTICIPANT_PALETTE[index % PARTICIPANT_PALETTE.length]
}

/**
 * Build a stable name->color map from an ordered list of participant names.
 * Order should be first-appearance order so the same names always get the
 * same colors within a session.
 */
export function buildParticipantColorMap(
  participants: string[],
): Record<string, string> {
  return Object.fromEntries(
    participants.map((p, i) => [p, getParticipantColor(i)]),
  )
}

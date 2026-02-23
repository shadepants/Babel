/**
 * Shared preset color map — used by ArenaStage, Gallery, and Configure.
 * Each value is an RGBA string at ~0.30 alpha suitable for background tints.
 */
export const PRESET_GLOW: Record<string, string> = {
  'conlang':            'rgba(88, 28, 135, 0.30)',
  'debate':             'rgba(127, 29, 29, 0.32)',
  'story':              'rgba(6,  78, 59, 0.28)',
  'cipher':             'rgba(120, 53, 15, 0.30)',
  'emotion-math':       'rgba(131, 24, 67, 0.28)',
  'philosophy':         'rgba(19, 78, 74, 0.28)',
  'original':           'rgba(113, 63, 18, 0.35)',
  'collab-svg':         'rgba(30, 58, 138, 0.30)',
  'prisoners-dilemma':  'rgba(124, 45, 18, 0.35)',
  'syntax-virus':       'rgba(20, 83, 45, 0.30)',
  'taboo-artifact':     'rgba(49, 46, 129, 0.28)',
}

/**
 * Returns the RGBA glow string for a preset, or null if not found.
 * Caller can use the null to skip decorative accents entirely.
 */
export function getPresetGlow(presetId: string | null | undefined): string | null {
  if (!presetId) return null
  return PRESET_GLOW[presetId] ?? null
}

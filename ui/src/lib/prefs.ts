/**
 * prefs.ts — User preference persistence via localStorage.
 *
 * Stores global defaults for Configure's custom path (rounds, temperature,
 * max_tokens, turn_delay). Preset paths always override these with their own
 * defaults — prefs only apply when the user hasn't selected a preset.
 */

const PREFS_KEY = 'babel_prefs_v1'

export interface BabelPrefs {
  defaultRounds: number
  defaultTemperature: number
  defaultMaxTokens: number
  defaultTurnDelay: number
}

/** Factory defaults — what you get before the user has saved anything. */
export const FACTORY_DEFAULTS: BabelPrefs = {
  defaultRounds: 5,
  defaultTemperature: 0.7,
  defaultMaxTokens: 1500,
  defaultTurnDelay: 2.0,
}

/** Read prefs from localStorage, falling back to factory defaults. */
export function getPrefs(): BabelPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...FACTORY_DEFAULTS }
    return { ...FACTORY_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...FACTORY_DEFAULTS }
  }
}

/** Merge-save a partial update into stored prefs. */
export function savePrefs(update: Partial<BabelPrefs>): void {
  const current = getPrefs()
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...update }))
}

/** Wipe saved prefs — next read returns factory defaults. */
export function resetPrefs(): void {
  localStorage.removeItem(PREFS_KEY)
}

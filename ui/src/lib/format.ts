/**
 * Format seconds into a human-readable duration string.
 * Examples: 42 -> "42s", 142 -> "2m 22s", 3661 -> "1h 1m 1s"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}m ${rem}s` : `${h}h ${rem}s`
}

/**
 * Extract a short display name from a litellm model string.
 * "anthropic/claude-sonnet-4-20250514" -> "claude-sonnet-4"
 * "gemini/gemini-2.5-flash"            -> "gemini-2.5-flash"
 */
export function modelDisplayName(model: string): string {
  const after = model.split('/').pop() ?? model
  return after.replace(/-\d{8}$/, '')
}

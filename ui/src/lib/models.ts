/**
 * Model version display helpers (Spec 019 -- Model Version Snapshot).
 *
 * Version strings stored in the DB have the form:
 *   "provider/model-name@YYYY-MM-DD"
 *
 * Examples:
 *   "anthropic/claude-haiku-4-5-20251001@2025-10-01"
 *   "gemini/gemini-2.5-flash@2026-03-01"
 */

/**
 * Format a raw version string into a human-readable tooltip label.
 *
 * Date-stamped models (Anthropic) get "v" prefix since the date is a pinned checkpoint.
 * Alias models (Gemini, OpenAI, Mistral) get "launched" prefix since the date is
 * only the launch-day proxy, not a guaranteed checkpoint.
 *
 * Returns at most 60 characters, truncated with ellipsis if longer.
 */
export function formatModelVersion(versionString: string | null | undefined): string {
  if (!versionString) return ''
  try {
    const atIdx = versionString.lastIndexOf('@')
    if (atIdx === -1) return versionString.slice(0, 60)

    const modelPart = versionString.slice(0, atIdx)   // e.g. "anthropic/claude-haiku-4-5-20251001"
    const datePart  = versionString.slice(atIdx + 1)  // e.g. "2025-10-01"

    // Strip provider prefix to get the bare model name
    const modelName = modelPart.includes('/')
      ? modelPart.split('/').slice(1).join('/')
      : modelPart

    // Date-stamped models have YYYYMMDD in their name (Anthropic pattern)
    const hasDateStamp = /\d{8}/.test(modelName)
    const label = hasDateStamp ? `v${datePart}` : `launched ${datePart}`

    const display = `${modelName} \u00b7 ${label}`
    return display.length > 60 ? `${display.slice(0, 57)}\u2026` : display
  } catch {
    return versionString.slice(0, 60)
  }
}

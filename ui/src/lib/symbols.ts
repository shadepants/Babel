/** Map emoji to sci-fi geometric symbols (shared between SeedLab and Configure) */
export const SYMBOL_MAP: Record<string, string> = {
  '\uD83E\uDDE0': '\u25C8', '\u2699\uFE0F': '\u2295', '\uD83C\uDFAD': '\u2726', '\uD83D\uDCCA': '\u2B21', '\uD83C\uDF31': '\u25C9',
  '\uD83E\uDD1D': '\u27E1', '\uD83D\uDD2C': '\u232C', '\uD83D\uDCA1': '\u25C7', '\uD83C\uDFAF': '\u2297', '\uD83E\uDD16': '\u29D6',
  '\uD83C\uDF0D': '\u25C9', '\u2696\uFE0F': '\u2297', '\uD83C\uDFAA': '\u2726', '\uD83D\uDD2E': '\u25C8', '\uD83D\uDDFA\uFE0F': '\u2B21',
  '\uD83C\uDF10': '\u2B21', '\uD83E\uDDEC': '\u25C8', '\u26A1': '\u2295', '\uD83C\uDF0A': '\u25C9', '\uD83D\uDD25': '\u2726',
}

/** Cycle of fallback symbols when emoji is not in SYMBOL_MAP */
export const FALLBACK_SYMBOLS = ['\u25C8', '\u2B21', '\u25C9', '\u2726', '\u2295', '\u27E1', '\u232C', '\u25C7', '\u2297', '\u29D6']

export function getSymbol(emoji: string, fallbackIndex?: number): string {
  return SYMBOL_MAP[emoji] ?? FALLBACK_SYMBOLS[(fallbackIndex ?? 0) % FALLBACK_SYMBOLS.length]
}

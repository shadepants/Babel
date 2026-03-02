/**
 * Static model metadata for the UI model guide and dropdown tags.
 * Keyed by litellm model string (must match MODEL_REGISTRY in server/config.py).
 * Update when models are added/removed from the registry.
 */

export interface ModelMeta {
  tier: 'S' | 'A' | 'B' | 'C' | 'D'
  tags: string[]      // cost/speed/capability pills shown in dropdown
  best_for: string[]  // Babel use-case labels shown in guide card
}

export const MODEL_META: Record<string, ModelMeta> = {
  // -- Anthropic -------------------------------------------------------
  'anthropic/claude-haiku-4-5-20251001':   { tier: 'C', tags: ['fast', 'paid'],                   best_for: ['language lab', 'support role'] },
  'anthropic/claude-sonnet-4-5-20250929':  { tier: 'A', tags: ['creative', 'paid'],                best_for: ['debate', 'RPG', 'creative experiments'] },
  'anthropic/claude-opus-4-5-20251101':    { tier: 'S', tags: ['creative', 'reasoning', 'paid'],   best_for: ['flagship debate', 'complex scenarios'] },
  // -- Google ----------------------------------------------------------
  'gemini/gemini-2.5-flash':               { tier: 'A', tags: ['fast', 'free', '250 RPD'],         best_for: ['judge', 'high-volume', 'debate'] },
  'gemini/gemini-2.5-flash-lite':          { tier: 'C', tags: ['fastest', 'free', '1000 RPD'],     best_for: ['budget batches', 'quick tests'] },
  'gemini/gemini-2.5-pro':                 { tier: 'S', tags: ['reasoning', 'free', '100 RPD'],    best_for: ['judge', 'complex debate', 'reasoning'] },
  // -- OpenAI ----------------------------------------------------------
  'openai/gpt-4.1-nano':                   { tier: 'C', tags: ['fast', 'paid'],                    best_for: ['quick tests', 'lightweight partner'] },
  'openai/gpt-4.1-mini':                   { tier: 'B', tags: ['balanced', 'paid'],                best_for: ['debate partner', 'RPG'] },
  'openai/gpt-4.1':                        { tier: 'A', tags: ['coding', 'paid'],                  best_for: ['coding debate', 'instruction following'] },
  // -- DeepSeek --------------------------------------------------------
  'deepseek/deepseek-chat':                { tier: 'A', tags: ['reasoning', 'low cost'],            best_for: ['debate', 'language lab'] },
  'deepseek/deepseek-reasoner':            { tier: 'S', tags: ['thinking', 'low cost'],             best_for: ['complex debate', 'judge', 'math/logic'] },
  // -- Groq / Llama ----------------------------------------------------
  'groq/llama-3.3-70b-versatile':          { tier: 'B', tags: ['fast', 'free', '14k RPD'],         best_for: ['high-volume runs', 'RPG', 'free tier'] },
  'groq/meta-llama/llama-4-scout-17b-16e-instruct':     { tier: 'C', tags: ['fast', 'free', '10M ctx'],  best_for: ['long RPG sessions', 'free tier'] },
  'groq/meta-llama/llama-4-maverick-17b-128e-instruct': { tier: 'A', tags: ['balanced', 'free'],         best_for: ['debate', 'RPG narrator'] },
  // -- Mistral ---------------------------------------------------------
  'mistral/mistral-small-latest':          { tier: 'D', tags: ['fast', 'paid'],                    best_for: ['lightweight'] },
  'mistral/mistral-large-latest':          { tier: 'B', tags: ['multilingual', 'paid'],             best_for: ['multilingual experiments'] },
  // -- OpenRouter ------------------------------------------------------
  'openrouter/qwen/qwen3-32b':             { tier: 'B', tags: ['reasoning', 'multilingual'],        best_for: ['reasoning debate', 'cross-lingual'] },
  // -- AI21 ------------------------------------------------------------
  'ai21/jamba-1.5-large':                  { tier: 'D', tags: ['hybrid arch', 'niche'],             best_for: ['experimental'] },
}

export const TIER_COLOR: Record<string, string> = {
  S: '#a78bfa',  // violet
  A: '#34d399',  // emerald
  B: '#60a5fa',  // blue
  C: '#facc15',  // yellow
  D: '#f87171',  // red
}

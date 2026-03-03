/**
 * Static model metadata for the UI model guide and dropdown tags.
 * Keyed by litellm model string (must match MODEL_REGISTRY in server/config.py).
 * Update when models are added/removed from the registry.
 */

export interface ModelMeta {
  tier: 'S' | 'A' | 'B' | 'C' | 'D'
  tags: string[]      // cost/speed/capability pills shown in dropdown
  best_for: string[]  // Babel use-case labels shown in guide card
  maxTemp: number     // provider API temperature ceiling (verified from official docs)
}

export const MODEL_META: Record<string, ModelMeta> = {
  // -- Anthropic (hard cap: 1.0 -- docs.anthropic.com/en/api/messages) ----
  'anthropic/claude-haiku-4-5-20251001':   { tier: 'C', tags: ['fast', 'paid'],                   best_for: ['language lab', 'support role'],               maxTemp: 1.0 },
  'anthropic/claude-sonnet-4-5-20250929':  { tier: 'A', tags: ['creative', 'paid'],                best_for: ['debate', 'RPG', 'creative experiments'],       maxTemp: 1.0 },
  'anthropic/claude-opus-4-5-20251101':    { tier: 'S', tags: ['creative', 'reasoning', 'paid'],   best_for: ['flagship debate', 'complex scenarios'],        maxTemp: 1.0 },
  // -- Google (max: 2.0 -- ai.google.dev/api/generate-content) ------------
  'gemini/gemini-2.5-flash':               { tier: 'A', tags: ['fast', 'free', '250 RPD'],         best_for: ['judge', 'high-volume', 'debate'],              maxTemp: 2.0 },
  'gemini/gemini-2.5-flash-lite':          { tier: 'C', tags: ['fastest', 'free', '1000 RPD'],     best_for: ['budget batches', 'quick tests'],               maxTemp: 2.0 },
  'gemini/gemini-2.5-pro':                 { tier: 'S', tags: ['reasoning', 'free', '100 RPD'],    best_for: ['judge', 'complex debate', 'reasoning'],        maxTemp: 2.0 },
  // -- OpenAI (max: 2.0 -- platform.openai.com/docs/api-reference) --------
  'openai/gpt-4.1-nano':                   { tier: 'C', tags: ['fast', 'paid'],                    best_for: ['quick tests', 'lightweight partner'],          maxTemp: 2.0 },
  'openai/gpt-4.1-mini':                   { tier: 'B', tags: ['balanced', 'paid'],                best_for: ['debate partner', 'RPG'],                       maxTemp: 2.0 },
  'openai/gpt-4.1':                        { tier: 'A', tags: ['coding', 'paid'],                  best_for: ['coding debate', 'instruction following'],      maxTemp: 2.0 },
  // -- DeepSeek (max: 2.0 -- api-docs.deepseek.com/api) -------------------
  'deepseek/deepseek-chat':                { tier: 'A', tags: ['reasoning', 'low cost'],            best_for: ['debate', 'language lab'],                      maxTemp: 2.0 },
  'deepseek/deepseek-reasoner':            { tier: 'S', tags: ['thinking', 'low cost'],             best_for: ['complex debate', 'judge', 'math/logic'],       maxTemp: 2.0 },
  // -- Groq / Llama (max: 2.0 -- console.groq.com/docs/api-reference) -----
  'groq/llama-3.3-70b-versatile':          { tier: 'B', tags: ['fast', 'free', '14k RPD'],         best_for: ['high-volume runs', 'RPG', 'free tier'],        maxTemp: 2.0 },
  'groq/meta-llama/llama-4-scout-17b-16e-instruct':     { tier: 'C', tags: ['fast', 'free', '10M ctx'],  best_for: ['long RPG sessions', 'free tier'],  maxTemp: 2.0 },
  'groq/meta-llama/llama-4-maverick-17b-128e-instruct': { tier: 'A', tags: ['balanced', 'free'],         best_for: ['debate', 'RPG narrator'],          maxTemp: 2.0 },
  // -- Mistral (max: 2.0 -- OpenAI-compatible; recommends 0-0.7, no hard limit below 2.0 in schema)
  'mistral/mistral-small-latest':          { tier: 'D', tags: ['fast', 'paid'],                    best_for: ['lightweight'],                                 maxTemp: 2.0 },
  'mistral/mistral-large-latest':          { tier: 'B', tags: ['multilingual', 'paid'],             best_for: ['multilingual experiments'],                    maxTemp: 2.0 },
  // -- OpenRouter (max: 2.0 -- openrouter.ai/docs/api/reference) ----------
  'openrouter/qwen/qwen3-32b':             { tier: 'B', tags: ['reasoning', 'multilingual'],        best_for: ['reasoning debate', 'cross-lingual'],           maxTemp: 2.0 },
  // -- AI21 (max: 2.0 -- docs.ai21.com/reference/jamba-15-api-ref) --------
  'ai21/jamba-1.5-large':                  { tier: 'D', tags: ['hybrid arch', 'niche'],             best_for: ['experimental'],                                maxTemp: 2.0 },
}

/** Returns the provider-enforced temperature ceiling for a model. Defaults to 2.0. */
export function getMaxTemp(modelId: string): number {
  return MODEL_META[modelId]?.maxTemp ?? 2.0
}

export const TIER_COLOR: Record<string, string> = {
  S: '#a78bfa',  // violet
  A: '#34d399',  // emerald
  B: '#60a5fa',  // blue
  C: '#facc15',  // yellow
  D: '#f87171',  // red
}

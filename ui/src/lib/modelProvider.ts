export type Provider = 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' | 'xai' | 'unknown'

const PREFIX_MAP: Record<string, Provider> = {
  anthropic: 'anthropic', claude: 'anthropic',
  openai: 'openai', gpt: 'openai', o1: 'openai', o3: 'openai', o4: 'openai',
  google: 'google', gemini: 'google',
  meta: 'meta', llama: 'meta',
  mistral: 'mistral', mixtral: 'mistral',
  xai: 'xai', grok: 'xai',
}

/** Extract provider from a litellm model string like "anthropic/claude-sonnet-4-20250514"
 *  or bare names like "gpt-4o", "claude-3-opus". Falls back to 'unknown'. */
export function getProvider(model: string): Provider {
  const prefix = model.split('/')[0].toLowerCase().replace(/-.*$/, '')
  return PREFIX_MAP[prefix] ?? 'unknown'
}

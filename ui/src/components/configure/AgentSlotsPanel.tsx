import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ModelInfo, PersonaRecord, AgentSlot } from '@/api/types'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AGENT_COLORS } from '@/components/theater/ConversationColumn'
import { MODEL_META, TIER_COLOR } from '@/lib/modelMeta'

// Tailwind can't purge dynamic class names; use explicit per-index color labels
const AGENT_LABELS = ['Model A', 'Model B', 'Model C', 'Model D']

interface PresetDefaults {
  rounds: number
  temperature: number
  maxTokens: number
}

interface AgentSlotsPanelProps {
  agents: AgentSlot[]
  models: ModelInfo[]
  modelStatus: Map<string, boolean>
  personas: PersonaRecord[]
  agentPersonaIds: (string | null)[]
  isCustom: boolean
  suggestedModels: [string, string]
  presetDefaults: PresetDefaults | null
  onSwapAB: () => void
  onAddAgent: () => void
  onRemoveAgent: (idx: number) => void
  onUpdateAgent: (idx: number, patch: Partial<AgentSlot>) => void
  onSetPersonaIds: Dispatch<SetStateAction<(string | null)[]>>
}

/**
 * N-way agent slot configurator.
 * Renders 2-4 agent cards, each with model selection, temperature, and optional persona.
 * All state lives in the parent (Configure.tsx); this component is purely presentational.
 */
export function AgentSlotsPanel({
  agents,
  models,
  modelStatus,
  personas,
  agentPersonaIds,
  isCustom,
  suggestedModels,
  presetDefaults,
  onSwapAB,
  onAddAgent,
  onRemoveAgent,
  onUpdateAgent,
  onSetPersonaIds,
}: AgentSlotsPanelProps) {
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="space-y-3">
      <div className="neural-section-label flex items-center justify-between">
        <span>// model_selection</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="font-mono text-[9px] text-text-dim/40 hover:text-accent tracking-wider uppercase transition-colors"
            title="Toggle model guide"
          >
            {showGuide ? '&#9650; guide' : '&#9660; guide'}
          </button>
          <button
            type="button"
            onClick={onSwapAB}
            className="font-mono text-[9px] text-accent/60 hover:text-accent tracking-wider uppercase transition-colors"
            title="Swap Model A and Model B"
          >
            &#8646; swap A&#8596;B
          </button>
          {agents.length < 4 && (
            <button
              type="button"
              onClick={onAddAgent}
              className="font-mono text-[9px] text-emerald-400/60 hover:text-emerald-400 tracking-wider uppercase transition-colors"
              title="Add a third or fourth model"
            >
              + Add Agent
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {agents.map((agent, idx) => {
          const agentColor = AGENT_COLORS[idx] ?? AGENT_COLORS[0]
          const label = AGENT_LABELS[idx] ?? `Agent ${idx + 1}`
          const isSuggested = !isCustom && suggestedModels[idx] && agent.model === suggestedModels[idx]
          const keyUnavailable = agent.model && modelStatus.get(agent.model) === false
          return (
            <div key={idx} className="space-y-2 p-3 border border-border-custom/40 rounded-sm bg-bg-deep/30">
              <div className="flex items-center justify-between">
                <label
                  className="font-mono text-[10px] tracking-wider uppercase"
                  style={{ color: agentColor }}
                >
                  &#9671; {label}
                </label>
                {agents.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveAgent(idx)}
                    className="font-mono text-[10px] text-danger/50 hover:text-danger transition-colors"
                    title="Remove this agent"
                  >
                    &#10005;
                  </button>
                )}
              </div>

              <Select value={agent.model} onValueChange={(v) => onUpdateAgent(idx, { model: v })}>
                <SelectTrigger
                  className="font-mono text-xs"
                  style={{ borderColor: agentColor + '4d' }}
                >
                  <SelectValue placeholder="Select model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => {
                    const meta = MODEL_META[m.model]
                    return (
                      <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                        <div className="flex flex-col gap-0.5 py-0.5">
                          <span>
                            {m.name}
                            {modelStatus.get(m.model) === false && (
                              <span className="ml-1 text-danger/70">&#9679;</span>
                            )}
                          </span>
                          {meta && (
                            <span className="text-[9px] text-text-dim/50 tracking-wide">
                              {meta.tags.slice(0, 3).join(' \u00b7 ')}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {keyUnavailable && (
                <p className="font-mono text-[9px] text-danger/80 tracking-wider">// api key not configured</p>
              )}
              {isSuggested && (
                <p className="font-mono text-[9px] text-accent/45 tracking-wider">// preset suggestion</p>
              )}

              {/* Per-agent temperature */}
              <div className="space-y-1 pt-1">
                <label className="font-mono text-[9px] tracking-wider uppercase block" style={{ color: agentColor + 'aa' }}>
                  Temperature <span className="text-accent/60">[{agent.temperature.toFixed(1)}]</span>
                  {presetDefaults && agent.temperature !== presetDefaults.temperature && (
                    <span className="ml-1.5 opacity-70" title="modified from preset default" style={{ color: agentColor }}>&#9679;</span>
                  )}
                </label>
                <Slider
                  value={[agent.temperature]}
                  onValueChange={(v) => onUpdateAgent(idx, { temperature: v[0] })}
                  min={0} max={2} step={0.1}
                />
                <div className="flex justify-between font-mono text-[9px] text-text-dim/50">
                  <span>0 precise</span><span>2 creative</span>
                </div>
                <p className="font-mono text-[9px] text-text-dim/40 tracking-wider mt-0.5">
                  // controls randomness -- higher values produce more surprising responses
                </p>
              </div>

              {/* Per-agent persona (Phase 16) */}
              {personas.length > 0 && (
                <div className="pt-1">
                  <label className="font-mono text-[9px] tracking-wider uppercase block mb-1" style={{ color: agentColor + 'aa' }}>
                    Persona
                  </label>
                  <select
                    value={agentPersonaIds[idx] ?? ''}
                    onChange={(e) => onSetPersonaIds(prev => {
                      const next = [...prev]
                      next[idx] = e.target.value || null
                      return next
                    })}
                    className="w-full bg-zinc-900 border border-white/10 focus:border-accent/40 rounded px-2 py-1 font-mono text-[10px] text-text-primary outline-none transition-colors"
                  >
                    <option value="">(none)</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Model guide card */}
      {showGuide && (
        <div className="mt-1 p-3 border border-border-custom/30 rounded-sm bg-bg-deep/50 space-y-2">
          <p className="font-mono text-[9px] text-text-dim/50 tracking-wider uppercase">
            // model guide &mdash; tiers &amp; use cases
          </p>
          <div className="space-y-1">
            {models.map((m) => {
              const meta = MODEL_META[m.model]
              if (!meta) return null
              const tierColor = TIER_COLOR[meta.tier] ?? '#888'
              return (
                <div key={m.model} className="flex items-start gap-2 py-0.5">
                  <span
                    className="font-mono text-[9px] w-4 shrink-0 mt-0.5 font-bold"
                    style={{ color: tierColor }}
                  >
                    {meta.tier}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10px] text-text-primary">{m.name}</span>
                    <span className="font-mono text-[9px] text-text-dim/40 ml-2">
                      {meta.best_for.join(', ')}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end shrink-0">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[8px] px-1 py-0.5 rounded-sm bg-white/5 text-text-dim/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

import { SpriteAvatar } from './SpriteAvatar'
import type { SpriteStatus } from './SpriteAvatar'
import { AGENT_COLORS } from './ConversationColumn'
import { getPresetGlow } from '@/lib/presetColors'

export interface AgentStageSlot {
  name: string
  status: SpriteStatus
}

interface ArenaStageProps {
  /** Phase 15-A: N-way agents (2-4). If provided, overrides legacy modelAName/modelBName props. */
  agents?: AgentStageSlot[]
  /** @deprecated use agents prop */
  modelAName?: string
  /** @deprecated use agents prop */
  modelBName?: string
  /** @deprecated use agents prop */
  statusA?: SpriteStatus
  /** @deprecated use agents prop */
  statusB?: SpriteStatus
  /** Preset id e.g. "conlang", "debate", "prisoners-dilemma" */
  preset?: string | null
}

const STATUS_LABELS: Record<SpriteStatus, string> = {
  idle:    '[ STANDBY ]',
  thinking: '[ PROCESSING ]',
  talking:  '[ OUTPUT ]',
  error:    '[ ERROR ]',
  winner:   '[ WINNER ]',
  loser:    '[ DEFEATED ]',
}

function agentStatusColor(status: SpriteStatus, accent: string): string {
  if (status === 'winner') return '#FCD34D'
  if (status === 'loser' || status === 'error') return '#EF4444'
  return accent
}

/**
 * Arena bout card -- positioned between VocabPanel and conversation columns.
 * 2 agents: VS divider layout (unchanged).
 * 3-4 agents: row of sprites with no VS divider.
 */
export function ArenaStage({ agents, modelAName, modelBName, statusA = 'idle', statusB = 'idle', preset }: ArenaStageProps) {
  // Normalize to agents array
  const slots: AgentStageSlot[] = agents ?? [
    { name: modelAName ?? 'MODEL_A', status: statusA },
    { name: modelBName ?? 'MODEL_B', status: statusB },
  ]

  const glowColor = preset ? (getPresetGlow(preset) ?? 'rgba(88, 28, 135, 0.25)') : 'rgba(88, 28, 135, 0.20)'

  const bgStyle = {
    background: `linear-gradient(135deg, ${glowColor} 0%, rgba(10, 15, 30, 0.85) 45%, rgba(10, 15, 30, 0.85) 55%, ${glowColor} 100%)`,
  }

  const isTwoAgent = slots.length === 2

  return (
    <div
      className="relative border-b border-border-custom arena-scanlines"
      style={bgStyle}
    >
      {/* HUD corner brackets */}
      <span className="absolute top-1.5 left-1.5 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true" style={{ lineHeight: 1 }}>{'['}</span>
      <span className="absolute top-1.5 left-3 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true" style={{ lineHeight: 1 }}>{'_'}</span>

      {/* Section label */}
      <div className="absolute top-1.5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="font-mono text-[8px] text-accent/40 tracking-widest uppercase">
          // arena
        </span>
      </div>

      <span className="absolute top-1.5 right-3 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true" style={{ lineHeight: 1 }}>{'_'}</span>
      <span className="absolute top-1.5 right-1.5 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true" style={{ lineHeight: 1 }}>{']'}</span>

      {/* Main row */}
      <div className={`flex items-center px-8 pt-6 pb-4 ${isTwoAgent ? 'justify-between' : 'justify-around gap-4'}`}>
        {slots.map((agent, idx) => {
          const accent = AGENT_COLORS[idx] ?? AGENT_COLORS[0]
          const labelColor = agentStatusColor(agent.status, accent)
          return (
            <div key={idx} className="flex flex-col items-center gap-2 min-w-0">
              <SpriteAvatar
                status={agent.status}
                accentColor={accent}
                instanceId={String(idx)}
                size={isTwoAgent ? 64 : 52}
              />
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="font-display text-xs font-semibold tracking-wider uppercase truncate max-w-[120px]"
                  style={{ color: labelColor }}
                >
                  {agent.name || `AGENT_${idx}`}
                </span>
                <span
                  className="font-mono text-[8px] tracking-widest uppercase"
                  style={{ color: labelColor, opacity: 0.6 }}
                >
                  {STATUS_LABELS[agent.status]}
                </span>
              </div>
            </div>
          )
        })}

        {/* VS divider -- only for 2-agent layout, inserted between slots */}
        {isTwoAgent && (
          <div className="flex flex-col items-center gap-1 px-4 absolute left-1/2 -translate-x-1/2">
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border-custom to-transparent" />
            <span className="font-display text-xs text-text-dim/40 tracking-[0.3em] uppercase">vs</span>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-border-custom to-transparent" />
          </div>
        )}
      </div>

      {/* Bottom HUD brackets */}
      <span className="absolute bottom-1.5 left-1.5 text-accent/20 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true">{'['}</span>
      <span className="absolute bottom-1.5 right-1.5 text-accent/20 font-mono text-xs leading-none pointer-events-none select-none" aria-hidden="true">{']'}</span>
    </div>
  )
}

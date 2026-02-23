import { SpriteAvatar } from './SpriteAvatar'
import type { SpriteStatus } from './SpriteAvatar'

interface ArenaStageProps {
  modelAName: string
  modelBName: string
  statusA: SpriteStatus
  statusB: SpriteStatus
  /** Preset id e.g. "conlang", "debate", "prisoners-dilemma" */
  preset?: string | null
}

/** Maps preset id to a subtle directional gradient color (left side of arena). */
const PRESET_GLOW: Record<string, string> = {
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

const STATUS_LABELS: Record<SpriteStatus, string> = {
  idle:    '[ STANDBY ]',
  thinking: '[ PROCESSING ]',
  talking:  '[ OUTPUT ]',
  error:    '[ ERROR ]',
  winner:   '[ WINNER ]',
  loser:    '[ DEFEATED ]',
}

/**
 * Arena bout card — positioned between VocabPanel and conversation columns.
 * Shows both sprites facing each other with a VS divider.
 * Preset-specific gradient tints the background.
 */
export function ArenaStage({ modelAName, modelBName, statusA, statusB, preset }: ArenaStageProps) {
  const glowColor = preset ? (PRESET_GLOW[preset] ?? 'rgba(88, 28, 135, 0.25)') : 'rgba(88, 28, 135, 0.20)'

  const bgStyle = {
    background: `linear-gradient(135deg, ${glowColor} 0%, rgba(10, 15, 30, 0.85) 45%, rgba(10, 15, 30, 0.85) 55%, ${glowColor.replace('model-a', 'model-b')} 100%)`,
  }

  const labelA = STATUS_LABELS[statusA]
  const labelB = STATUS_LABELS[statusB]
  const colorA = statusA === 'winner' ? '#FCD34D' : statusA === 'loser' || statusA === 'error' ? '#EF4444' : '#F59E0B'
  const colorB = statusB === 'winner' ? '#FCD34D' : statusB === 'loser' || statusB === 'error' ? '#EF4444' : '#06B6D4'

  return (
    <div
      className="relative border-b border-border-custom arena-scanlines"
      style={bgStyle}
    >
      {/* HUD corner brackets — top-left */}
      <span
        className="absolute top-1.5 left-1.5 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
        style={{ lineHeight: 1 }}
      >{'['}</span>
      <span
        className="absolute top-1.5 left-3 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
        style={{ lineHeight: 1 }}
      >{'_'}</span>

      {/* Section label */}
      <div className="absolute top-1.5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="font-mono text-[8px] text-accent/40 tracking-widest uppercase">
          // arena
        </span>
      </div>

      {/* HUD corner brackets — top-right */}
      <span
        className="absolute top-1.5 right-3 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
        style={{ lineHeight: 1 }}
      >{'_'}</span>
      <span
        className="absolute top-1.5 right-1.5 text-accent/30 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
        style={{ lineHeight: 1 }}
      >{']'}</span>

      {/* Main row */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4">

        {/* Model A side */}
        <div className="flex flex-col items-center gap-2 min-w-0">
          <SpriteAvatar status={statusA} color="model-a" size={64} />
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="font-display text-xs font-semibold tracking-wider uppercase truncate max-w-[140px]"
              style={{ color: colorA }}
            >
              {modelAName || 'MODEL_A'}
            </span>
            <span
              className="font-mono text-[8px] tracking-widest uppercase"
              style={{ color: colorA, opacity: 0.6 }}
            >
              {labelA}
            </span>
          </div>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center gap-1 px-4">
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-border-custom to-transparent" />
          <span className="font-display text-xs text-text-dim/40 tracking-[0.3em] uppercase">vs</span>
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-border-custom to-transparent" />
        </div>

        {/* Model B side */}
        <div className="flex flex-col items-center gap-2 min-w-0">
          <SpriteAvatar status={statusB} color="model-b" size={64} />
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="font-display text-xs font-semibold tracking-wider uppercase truncate max-w-[140px]"
              style={{ color: colorB }}
            >
              {modelBName || 'MODEL_B'}
            </span>
            <span
              className="font-mono text-[8px] tracking-widest uppercase"
              style={{ color: colorB, opacity: 0.6 }}
            >
              {labelB}
            </span>
          </div>
        </div>

      </div>

      {/* Bottom HUD brackets */}
      <span
        className="absolute bottom-1.5 left-1.5 text-accent/20 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
      >{'['}</span>
      <span
        className="absolute bottom-1.5 right-1.5 text-accent/20 font-mono text-xs leading-none pointer-events-none select-none"
        aria-hidden="true"
      >{']'}</span>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TurnEvent, ScoreEvent, VocabEvent } from '@/api/types'
import { cn } from '@/lib/utils'
import { TypewriterText } from './TypewriterText'

interface TurnBubbleProps {
  turn: TurnEvent
  color: 'model-a' | 'model-b'
  score?: ScoreEvent
  /** True only for the single latest turn — enables typewriter reveal */
  isLatest?: boolean
  /** Vocab events for inline dictionary links (skipped on the latest turn) */
  vocab?: VocabEvent[]
  /** Experiment ID for dictionary deep links */
  experimentId?: string
}

/** Wrap vocab words in dictionary links. Only called on static (non-latest) turns. */
function linkifyVocab(
  content: string,
  vocab: VocabEvent[],
  experimentId: string,
): React.ReactNode {
  if (!vocab.length) return content

  // Sort longest first to prevent shorter words shadowing compound matches
  const sorted = [...vocab].sort((a, b) => b.word.length - a.word.length)
  // Escape regex metacharacters via function replacer (avoids $& in replacement string)
  const escaped = sorted.map((w) =>
    w.word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, (m) => '\\' + m),
  )
  const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const word = match[0]
    const slug = word.toLowerCase().replace(/\s+/g, '-')
    parts.push(
      <Link
        key={`${match.index}-${word}`}
        to={`/dictionary/${experimentId}#word-${slug}`}
        className="text-accent/80 hover:text-accent underline underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {word}
      </Link>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length ? <>{parts}</> : content
}

/**
 * Single conversation turn — terminal log style.
 * Left-stripe accent, scanline texture, typewriter reveal for latest turn.
 * Hover the latency badge to see the wall-clock timestamp.
 */
export function TurnBubble({ turn, color, score, isLatest, vocab, experimentId }: TurnBubbleProps) {
  const [showTime, setShowTime] = useState(false)

  const isA       = color === 'model-a'
  const accent    = isA ? '#F59E0B' : '#06B6D4'
  const dimAccent = isA ? 'rgba(245,158,11,0.18)' : 'rgba(6,182,212,0.18)'
  const borderTop = isA ? 'rgba(245,158,11,0.12)' : 'rgba(6,182,212,0.12)'

  const wallTime = turn.timestamp
    ? new Date(turn.timestamp * 1000).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  // Static turns get vocab linking; latest turn uses TypewriterText
  const contentNode =
    isLatest || !vocab?.length || !experimentId
      ? <TypewriterText text={turn.content} active={!!isLatest} />
      : <span className="whitespace-pre-wrap break-words">{linkifyVocab(turn.content, vocab, experimentId)}</span>

  return (
    <div
      className="animate-fade-in"
      style={{
        borderLeft: `3px solid ${accent}`,
        borderTop: `1px solid ${borderTop}`,
        borderRight: `1px solid ${borderTop}`,
        borderBottom: `1px solid ${borderTop}`,
        borderRadius: '2px',
        background: `linear-gradient(90deg, ${dimAccent} 0%, rgba(10,15,30,0.7) 18%)`,
        backgroundImage: [
          `linear-gradient(90deg, ${dimAccent} 0%, rgba(10,15,30,0.7) 18%)`,
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.007) 2px, rgba(255,255,255,0.007) 3px)',
        ].join(', '),
        padding: '8px 12px',
      }}
    >
      {/* Header: round tag + latency / timestamp on hover */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-[9px] tracking-wider uppercase"
          style={{ color: accent, opacity: 0.65 }}
        >
          [R.{turn.round}]
        </span>
        <span
          className="font-mono text-[9px] text-text-dim/40 tabular-nums cursor-default select-none"
          onMouseEnter={() => setShowTime(true)}
          onMouseLeave={() => setShowTime(false)}
          title={wallTime ? `${wallTime} | ${turn.latency_s}s latency` : undefined}
        >
          {showTime && wallTime ? wallTime : `${turn.latency_s}s`}
        </span>
      </div>

      {/* Content — JetBrains Mono */}
      <div className="font-mono text-sm text-text-primary leading-relaxed">
        {contentNode}
      </div>

      {/* Score badges */}
      {score && (
        <div className="mt-3 pt-2 animate-fade-in" style={{ borderTop: `1px solid ${borderTop}` }}>
          <div className="flex gap-4 flex-wrap">
            <ScorePill label="creativity" value={score.creativity} color="#F59E0B" />
            <ScorePill label="coherence"  value={score.coherence}  color="#06B6D4" />
            <ScorePill label="engagement" value={score.engagement} color="#34D399" />
            <ScorePill label="novelty"    value={score.novelty}    color="#A78BFA" />
          </div>
        </div>
      )}
    </div>
  )
}

function ScorePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('font-mono text-xs font-semibold tabular-nums')} style={{ color }}>
        {value.toFixed(2)}
      </span>
      <span className="font-mono text-[8px] text-text-dim/40 tracking-wider uppercase">{label}</span>
    </div>
  )
}

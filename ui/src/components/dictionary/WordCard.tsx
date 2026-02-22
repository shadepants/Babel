import { cn } from '@/lib/utils'
import type { VocabWord } from '@/api/types'

interface WordCardProps {
  word: VocabWord
  modelA: string   // display name for color mapping
  modelB: string
}

/**
 * Displays an invented word with its meaning, category, and metadata.
 * Color-coded by which model coined it (indigo=A, amber=B).
 */
export function WordCard({ word, modelA, modelB }: WordCardProps) {
  const isModelA = word.coined_by === modelA
  const color = isModelA ? 'model-a' : 'model-b'
  const borderColor = isModelA ? 'border-model-a/30' : 'border-model-b/30'
  const badgeBg = isModelA
    ? 'bg-model-a/20 text-model-a'
    : 'bg-model-b/20 text-model-b'

  return (
    <div className={cn('rounded-lg border bg-bg-card p-4 animate-fade-in', borderColor)}>
      {/* Word name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-lg font-bold text-text-primary">
          {word.word}
        </span>
        {word.category && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/20 text-accent">
            {word.category}
          </span>
        )}
      </div>

      {/* Meaning */}
      <p className="text-sm text-text-primary/80 mb-3 leading-relaxed">
        {word.meaning ?? (
          <span className="italic text-text-dim">meaning unknown</span>
        )}
      </p>

      {/* Metadata row */}
      <div className="flex items-center justify-between text-xs text-text-dim">
        <span className={cn('px-2 py-0.5 rounded-full', badgeBg)}>
          {word.coined_by}
        </span>
        <div className="flex items-center gap-3">
          <span>Round {word.coined_round}</span>
          {word.usage_count > 1 && (
            <span className={cn('text-xs', `text-${color}`)}>
              {word.usage_count}x used
            </span>
          )}
        </div>
      </div>

      {/* Parent words */}
      {word.parent_words && word.parent_words.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-custom flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-dim uppercase tracking-wider">from:</span>
          {word.parent_words.map((parent) => (
            <span
              key={parent}
              className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg-card-hover text-text-primary/70"
            >
              {parent}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

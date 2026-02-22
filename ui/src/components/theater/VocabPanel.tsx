import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { VocabEvent } from '@/api/types'

interface VocabPanelProps {
  vocab: VocabEvent[]
  matchId: string
  modelA: string   // display name for color mapping
}

/**
 * Slim vocabulary strip shown during live experiments.
 * Displays word count + last 5 coined words as colored badges.
 * Links to the full Dictionary page for deep exploration.
 */
export function VocabPanel({ vocab, matchId, modelA }: VocabPanelProps) {
  if (vocab.length === 0) return null

  const recentWords = vocab.slice(-5).reverse()

  return (
    <div className="mx-4 px-4 py-2 rounded-lg bg-bg-card border border-border-custom flex items-center gap-3 animate-fade-in">
      {/* Word count */}
      <span className="text-xs text-text-dim whitespace-nowrap">
        {vocab.length} word{vocab.length !== 1 ? 's' : ''} coined
      </span>

      {/* Recent words as badges */}
      <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
        {recentWords.map((v) => {
          const isModelA = v.coined_by === modelA
          return (
            <span
              key={v.word}
              className={cn(
                'text-xs font-mono px-2 py-0.5 rounded-full truncate max-w-[120px]',
                isModelA
                  ? 'bg-model-a/20 text-model-a'
                  : 'bg-model-b/20 text-model-b',
              )}
            >
              {v.word}
            </span>
          )
        })}
      </div>

      {/* Link to dictionary */}
      <Link
        to={`/dictionary/${matchId}`}
        className="text-xs text-accent hover:text-accent/80 whitespace-nowrap"
      >
        View dictionary →
      </Link>
    </div>
  )
}

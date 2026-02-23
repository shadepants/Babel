import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { VocabWord, ExperimentRecord } from '@/api/types'
import { Button } from '@/components/ui/button'
import { WordCard } from '@/components/dictionary/WordCard'
import { ConstellationGraph } from '@/components/dictionary/ConstellationGraph'
import { cn } from '@/lib/utils'

type View = 'cards' | 'constellation'

export default function Dictionary() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null)
  const [words, setWords] = useState<VocabWord[]>([])
  const [view, setView] = useState<View>('cards')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)
  const [showLowConfidence, setShowLowConfidence] = useState(true)

  const fetchData = useCallback(async () => {
    if (!experimentId) return
    try {
      const [exp, vocab] = await Promise.all([
        api.getExperiment(experimentId),
        api.getVocabulary(experimentId),
      ])
      setExperiment(exp)
      setWords(vocab.words)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [experimentId])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll every 10s if experiment is still running
  useEffect(() => {
    if (!experiment || experiment.status !== 'running') return
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [experiment, fetchData])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-text-dim animate-pulse-slow">Loading dictionary...</span>
      </div>
    )
  }

  if (error || !experiment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-danger">{error ?? 'Experiment not found'}</p>
        <Link to="/" className="text-accent hover:underline text-sm">
          ← Back to Seed Lab
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="border-b border-border-custom px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link to={`/theater/${experimentId}`} className="text-xs text-text-dim hover:text-accent">
              &larr; Theater
            </Link>
            <h1 className="text-xl font-bold text-text-primary mt-1">
              Vocabulary Dictionary
            </h1>
            <p className="text-sm text-text-dim mt-0.5">
              <span className="text-model-a">{experiment.model_a}</span>
              {' vs '}
              <span className="text-model-b">{experiment.model_b}</span>
              {' · '}
              {experiment.rounds_completed}/{experiment.rounds_planned} rounds
              {experiment.status === 'running' && (
                <span className="ml-2 text-success animate-pulse-slow">● Live</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-accent">
              {words.length}
            </span>
            <span className="text-sm text-text-dim">
              word{words.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-4 mt-4">
        <div className="flex gap-2">
        <Button
          variant={view === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('cards')}
        className={cn(
            view === 'cards' && 'bg-accent hover:bg-accent/90',
            )}
        >
            Cards
          </Button>
        <Button
          variant={view === 'constellation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('constellation')}
        className={cn(
            view === 'constellation' && 'bg-accent hover:bg-accent/90',
            )}
        >
            Constellation
            </Button>
          </div>
          {words.some((w) => w.confidence === 'low') && (
            <button
              onClick={() => setShowLowConfidence(!showLowConfidence)}
              className={cn(
                'text-xs font-mono tracking-wider transition-colors',
                showLowConfidence ? 'text-text-dim hover:text-accent' : 'text-accent hover:text-accent/80',
              )}
            >
              {showLowConfidence ? 'Hide uncertain' : 'Show all'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {(() => {
          const filteredWords = showLowConfidence
            ? words
            : words.filter((w) => w.confidence !== 'low')
          return filteredWords.length === 0 ? (
          <div className="text-center text-text-dim py-16">
            <p className="text-lg">No words coined yet</p>
            <p className="text-sm mt-1">
              Words will appear here as the models invent them
            </p>
          </div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                modelA={experiment.model_a}
                modelB={experiment.model_b}
              />
            ))}
          </div>
        ) : (
          <div>
            <ConstellationGraph
              words={filteredWords}
              modelA={experiment.model_a}
              modelB={experiment.model_b}
              onNodeClick={setSelectedWord}
            />
            {/* Selected word detail */}
            {selectedWord && (
              <div className="mt-4 max-w-md mx-auto">
                <WordCard
                  word={selectedWord}
                  modelA={experiment.model_a}
                  modelB={experiment.model_b}
                />
                <button
                  onClick={() => setSelectedWord(null)}
                  className="mt-2 text-xs text-text-dim hover:text-text-primary w-full text-center"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )
        })()}
      </div>
    </div>
  )
}

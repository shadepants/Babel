import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { VocabWord, ExperimentRecord } from '@/api/types'
import { WordCard } from '@/components/dictionary/WordCard'
import { ConstellationGraph } from '@/components/dictionary/ConstellationGraph'
import { VocabTimeline } from '@/components/dictionary/VocabTimeline'
import { VocabBurstChart } from '@/components/dictionary/VocabBurstChart'
import { buildParticipantColorMap } from '@/lib/participantColors'
import { modelDisplayName } from '@/lib/format'
import { cn } from '@/lib/utils'

type ViewMode = 'cards' | 'constellation' | 'timeline' | 'burst'
type SortBy = 'round' | 'usage' | 'alpha'

export default function Dictionary() {
  const { experimentId } = useParams<{ experimentId: string }>()
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null)
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View + search/filter/sort state
  const [view, setView] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterParticipant, setFilterParticipant] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('round')

  // Shared selection across all three views
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null)

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

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!experiment || experiment.status !== 'running') return
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [experiment, fetchData])

  // ── Derived stats ───────────────────────────────────────────────────────────
  const byCoinedBy = useMemo(() => {
    const map: Record<string, VocabWord[]> = {}
    for (const w of words) {
      ;(map[w.coined_by] ??= []).push(w)
    }
    return map
  }, [words])

  const participants = useMemo(() => Object.keys(byCoinedBy), [byCoinedBy])

  const colorMap = useMemo(
    () => buildParticipantColorMap(participants),
    [participants],
  )

  const mostUsed = useMemo(
    () => words.reduce<VocabWord | null>(
      (best, w) => (!best || w.usage_count > best.usage_count ? w : best),
      null,
    ),
    [words],
  )

  const categoryCount = useMemo(
    () => new Set(words.map(w => w.category).filter(Boolean)).size,
    [words],
  )

  // ── Filtered + sorted words ─────────────────────────────────────────────────
  const filteredWords = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return words
      .filter(w =>
        (!q ||
          w.word.toLowerCase().includes(q) ||
          (w.meaning ?? '').toLowerCase().includes(q))
        && (!filterParticipant || w.coined_by === filterParticipant),
      )
      .sort((a, b) => {
        if (sortBy === 'round') return a.coined_round - b.coined_round
        if (sortBy === 'usage') return b.usage_count - a.usage_count
        return a.word.localeCompare(b.word)
      })
  }, [words, searchQuery, filterParticipant, sortBy])

  // ── Loading / error states ──────────────────────────────────────────────────
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
          &larr; Back to Seed Lab
        </Link>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Header ── */}
      <div className="border-b border-border-custom px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <Link to={`/theater/${experimentId}`} className="text-xs text-text-dim hover:text-accent">
              &larr; Theater
            </Link>
            <h1 className="text-xl font-bold text-text-primary mt-1">
              Vocabulary Dictionary
            </h1>
            <p className="text-sm text-text-dim mt-0.5">
              {participants.map((p, i) => (
                <span key={p}>
                  {i > 0 && <span className="text-text-dim"> vs </span>}
                  <span style={{ color: colorMap[p] }}>{modelDisplayName(p)}</span>
                </span>
              ))}
              {' \u00b7 '}
              {experiment.rounds_completed}/{experiment.rounds_planned} rounds
              {experiment.status === 'running' && (
                <span className="ml-2 text-success animate-pulse-slow"><span className="font-symbol">&bull;</span> Live</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-accent">{words.length}</span>
            <span className="text-sm text-text-dim">word{words.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Stats bar ── */}
        {words.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 font-mono text-xs text-text-dim">
            <span>
              <span className="text-text-secondary">TOTAL:</span>{' '}
              <span className="text-accent">{words.length}</span>
            </span>
            {Object.entries(byCoinedBy).map(([name, ws]) => (
              <span key={name} className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: colorMap[name] }}
                />
                <span style={{ color: colorMap[name] }}>{modelDisplayName(name)}:</span>{' '}
                <span className="text-text-secondary">{ws.length}</span>
              </span>
            ))}
            {mostUsed && (
              <span>
                <span className="text-text-secondary">MOST USED:</span>{' '}
                <span className="text-text-primary">{mostUsed.word}</span>
                {' '}
                <span className="text-accent font-symbol">&times;</span>
                <span className="text-accent">{mostUsed.usage_count}</span>
              </span>
            )}
            {categoryCount > 0 && (
              <span>
                <span className="text-text-secondary">CATEGORIES:</span>{' '}
                <span className="text-text-primary">{categoryCount}</span>
              </span>
            )}
          </div>
        )}

        {/* ── Search / filter / sort ── */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          {/* Search input */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="// search words..."
            className={cn(
              'font-mono text-xs bg-transparent border border-border-custom rounded px-2 py-1',
              'text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent',
              'w-48',
            )}
          />

          {/* Participant filter chips */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterParticipant(null)}
              className={cn(
                'text-xs font-mono px-2 py-0.5 rounded border transition-colors',
                filterParticipant === null
                  ? 'border-accent text-accent'
                  : 'border-border-custom text-text-dim hover:text-text-secondary',
              )}
            >
              all
            </button>
            {participants.map(p => (
              <button
                key={p}
                onClick={() => setFilterParticipant(filterParticipant === p ? null : p)}
                className={cn(
                  'text-xs font-mono px-2 py-0.5 rounded border transition-colors',
                )}
                style={
                  filterParticipant === p
                    ? { borderColor: colorMap[p], color: colorMap[p] }
                    : { borderColor: 'var(--border-custom)', color: 'var(--text-dim)' }
                }
              >
                {modelDisplayName(p)}
              </button>
            ))}
          </div>

          {/* Sort pills */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-text-dim font-mono mr-1">sort:</span>
            {(['round', 'usage', 'alpha'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn(
                  'text-xs font-mono px-2 py-0.5 rounded border transition-colors',
                  sortBy === s
                    ? 'border-amber-400 text-amber-400'
                    : 'border-border-custom text-text-dim hover:text-text-secondary',
                )}
              >
                {s === 'round' ? 'round' : s === 'usage' ? 'used' : 'a\u2011z'}
              </button>
            ))}
          </div>
        </div>

        {/* ── View tabs ── */}
        <div className="flex gap-2 mt-3">
          {(['cards', 'constellation', 'timeline', 'burst'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'text-xs font-mono px-3 py-1 rounded border transition-colors',
                view === v
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border-custom text-text-dim hover:text-text-secondary',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4 min-h-0">

        {filteredWords.length === 0 && words.length === 0 ? (
          <div className="text-center text-text-dim py-16">
            <p className="text-lg">No words coined yet</p>
            <p className="text-sm mt-1">Words will appear here as the models invent them</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center text-text-dim py-16">
            <p className="text-lg">No words match your filters</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterParticipant(null) }}
              className="text-sm text-accent hover:underline mt-1"
            >
              Clear filters
            </button>
          </div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map(word => (
              <div
                key={word.id}
                id={`word-${word.word.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <WordCard
                  word={word}
                  colorMap={colorMap}
                  onSelect={setSelectedWord}
                />
              </div>
            ))}
          </div>
        ) : view === 'constellation' ? (
          <ConstellationGraph
            words={filteredWords}
            colorMap={colorMap}
            filterParticipant={filterParticipant}
            onSelectWord={setSelectedWord}
          />
        ) : view === 'timeline' ? (
          <VocabTimeline
            words={words}
            filteredWords={filteredWords}
            colorMap={colorMap}
            onSelectWord={setSelectedWord}
          />
        ) : (
          <VocabBurstChart
            words={filteredWords}
            colorMap={colorMap}
            onSelectWord={setSelectedWord}
          />
        )}

        {/* ── Selected word panel (shared across all views) ── */}
        {selectedWord && (
          <div className="mt-2 max-w-md mx-auto w-full shrink-0">
            <WordCard word={selectedWord} colorMap={colorMap} />
            <button
              onClick={() => setSelectedWord(null)}
              className="mt-2 text-xs text-text-dim hover:text-text-primary w-full text-center"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

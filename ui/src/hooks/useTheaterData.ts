import { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { resolveWinnerIndex } from '@/lib/spriteStatus'
import type { AgentConfig, ExperimentRecord, TurnEvent, ScoreEvent, VocabEvent } from '@/api/types'

// ── AgentSlot (mirrors the Theater-local interface) ──────────────
export interface AgentSlot { name: string; model: string }

/** Verdict shape returned from the DB (mirrors SSE VerdictEvent payload). */
export interface DbVerdict {
  winner: string
  winner_model: string
  reasoning: string
}

/** All data loaded from REST endpoints on Theater mount. */
export interface TheaterData {
  /** Populated from GET /api/experiments/:id */
  experiment: ExperimentRecord | null
  /** Parsed agent display slots (name + model), derived from experiment */
  agentSlots: AgentSlot[]
  preset: string | null
  parentId: string | null
  hasHiddenGoals: boolean
  /** DB fallback turns (used when SSE history is unavailable) */
  dbTurns: TurnEvent[]
  /** DB fallback scores keyed by turn_id */
  dbScores: Record<number, ScoreEvent>
  /** DB fallback verdict */
  dbVerdict: DbVerdict | null
  /** DB fallback vocab */
  dbVocab: VocabEvent[]
}

const EMPTY: TheaterData = {
  experiment: null,
  agentSlots: [],
  preset: null,
  parentId: null,
  hasHiddenGoals: false,
  dbTurns: [],
  dbScores: {},
  dbVerdict: null,
  dbVocab: [],
}

/** Parse agent display slots from an experiment record.
 *  Prefers agents_config_json; falls back to legacy model_a/model_b columns.
 *  locationNames: [nameA, nameB] from router state (accurate display names for legacy experiments). */
function parseAgents(exp: ExperimentRecord, locationNames: [string, string]): AgentSlot[] {
  if (exp.agents_config_json) {
    try {
      const parsed = JSON.parse(exp.agents_config_json) as AgentConfig[]
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.map((a) => ({
          model: a.model,
          name: a.name || a.model.split('/').pop() || a.model,
        }))
      }
    } catch { /* fall through */ }
  }
  // Legacy 2-agent: prefer location.state display names, fall back to split heuristic
  const nameA = locationNames[0] || exp.model_a.split('/').pop() || exp.model_a
  const nameB = locationNames[1] || exp.model_b.split('/').pop() || exp.model_b
  return [
    { model: exp.model_a, name: nameA },
    { model: exp.model_b, name: nameB },
  ]
}

/**
 * Loads all REST data needed by Theater on mount.
 *
 * @param matchId  - The experiment ID from the route. Pass undefined to get empty state.
 * @param locNameA - Legacy display name for agent A from router location.state.
 * @param locNameB - Legacy display name for agent B from router location.state.
 *
 * The effect runs only when matchId changes. locNameA/locNameB are stable
 * navigation-state strings that do not change during a mounted Theater instance,
 * so they are read inside the effect without being listed as dependencies.
 */
export function useTheaterData(
  matchId: string | undefined,
  locNameA: string,
  locNameB: string,
): TheaterData {
  const [data, setData] = useState<TheaterData>(() => ({
    ...EMPTY,
    agentSlots: [
      { name: locNameA, model: '' },
      { name: locNameB, model: '' },
    ],
  }))

  useEffect(() => {
    if (!matchId) return

    // locNameA/locNameB are stable router location.state values that are set once
    // on navigation and never change while this Theater instance is mounted.
    // They are read here for the parseAgents call without being dep-array items
    // because including them would require memoising location.state — unnecessary
    // complexity for values that are structurally immutable once navigation lands.
    api.getExperiment(matchId)
      .then((exp) => {
        const slots = parseAgents(exp, [locNameA, locNameB])

        const base: Partial<TheaterData> = {
          experiment: exp,
          agentSlots: slots,
          preset: exp.preset ?? null,
          parentId: exp.parent_experiment_id ?? null,
          hasHiddenGoals: !!exp.hidden_goals_json,
          dbTurns: [],
          dbScores: {},
          dbVerdict: null,
          dbVocab: [],
        }

        if (exp.status === 'completed' || exp.status === 'stopped' || exp.status === 'error') {
          // Kick off all four parallel fetches; accumulate results into state
          const fetchTurns = api.getExperimentTurns(matchId)
            .then(({ turns }) => turns.map((r) => ({
              type: 'relay.turn' as const,
              turn_id: String(r.id),
              round: r.round,
              speaker: r.speaker,
              model: r.model,
              content: r.content,
              latency_s: r.latency_seconds ?? 0,
              timestamp: new Date(r.created_at).getTime() / 1000,
              match_id: matchId,
            })))
            .catch((_err) => { console.error(_err); return [] as TurnEvent[] })

          const fetchScores = api.getExperimentScores(matchId)
            .then(({ scores }) => {
              const map: Record<number, ScoreEvent> = {}
              for (const s of scores) {
                map[s.turn_id] = {
                  type: 'relay.score',
                  turn_id: s.turn_id,
                  creativity: s.creativity,
                  coherence: s.coherence,
                  engagement: s.engagement,
                  novelty: s.novelty,
                  timestamp: new Date(s.scored_at).getTime() / 1000,
                  match_id: matchId,
                }
              }
              return map
            })
            .catch((_err) => { console.error(_err); return {} as Record<number, ScoreEvent> })

          const fetchVocab = api.getVocabulary(matchId)
            .then(({ words }) => words.map((w) => ({
              type: 'relay.vocab' as const,
              word: w.word,
              meaning: w.meaning ?? null,
              coined_by: w.coined_by,
              coined_round: w.coined_round,
              category: w.category ?? null,
              parent_words: w.parent_words ?? [],
              timestamp: 0,
              match_id: matchId,
            })))
            .catch((_err) => { console.error(_err); return [] as VocabEvent[] })

          const dbVerdict: DbVerdict | null = (() => {
            if (exp.winner && exp.verdict_reasoning) {
              const winnerIdx = resolveWinnerIndex(exp.winner)
              return {
                winner: exp.winner,
                winner_model: winnerIdx != null ? (slots[winnerIdx]?.model ?? 'tie') : 'tie',
                reasoning: exp.verdict_reasoning,
              }
            }
            return null
          })()

          Promise.all([fetchTurns, fetchScores, fetchVocab]).then(([dbTurns, dbScores, dbVocab]) => {
            setData({ ...base as TheaterData, dbTurns, dbScores, dbVerdict, dbVocab })
          })
        } else {
          setData(base as TheaterData)
        }
      })
      .catch(console.error)
  }, [matchId]) // locNameA/locNameB intentionally omitted: stable router navigation-state, set once on mount

  return data
}

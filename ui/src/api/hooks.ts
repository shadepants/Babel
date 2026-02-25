/**
 * Derived experiment state from raw SSE events.
 *
 * Why event sourcing? The SSE events are the single source of truth.
 * UI state is always a pure function of those events — no sync bugs,
 * trivially debuggable, and replaying events for late joiners works
 * automatically (backend's include_history=true parameter).
 */
import { useMemo } from 'react';
import type { RelaySSEEvent, TurnEvent, VocabEvent, ScoreEvent, VerdictEvent, ObserverEvent } from './types';

export interface ExperimentState {
  turns: TurnEvent[];
  vocab: VocabEvent[];
  scores: Record<string | number, ScoreEvent>;  // keyed by turn_id
  verdict: VerdictEvent | null;
  currentRound: number;
  totalRounds: number;
  thinkingSpeaker: string | null;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped';
  preset: string | null;
  observers: ObserverEvent[];
  elapsed: number | null;
  errorMessage: string | null;
  isAwaitingHuman: boolean;
}

export function useExperimentState(events: RelaySSEEvent[]): ExperimentState {
  return useMemo(() => {
    const state: ExperimentState = {
      turns: [],
      vocab: [],
      scores: {},
      verdict: null,
      currentRound: 0,
      totalRounds: 0,
      thinkingSpeaker: null,
      status: 'idle',
      preset: null,
      elapsed: null,
      errorMessage: null,
      observers: [],
      isAwaitingHuman: false,
    };

    for (const event of events) {
      switch (event.type) {
        case 'relay.thinking':
          state.thinkingSpeaker = event.speaker;
          state.status = 'running';
          break;
        case 'relay.turn':
          if (state.status === 'error') state.status = 'running'; // reset transient error when match continues
          state.turns.push(event);
          state.thinkingSpeaker = null;
          state.currentRound = event.round;
          state.isAwaitingHuman = false;
          break;
        case 'relay.round':
          state.currentRound = event.round;
          state.totalRounds = event.rounds_total;
          break;
        case 'relay.done':
          state.status = 'completed';
          state.elapsed = event.elapsed_s;
          state.thinkingSpeaker = null;
          break;
        case 'relay.error':
          state.status = 'error';
          state.errorMessage = event.message;
          state.thinkingSpeaker = null;
          break;
        case 'relay.vocab': {
          const idx = state.vocab.findIndex((v) => v.word === event.word);
          if (idx >= 0) {
            state.vocab[idx] = event; // re-encounter: update in place
          } else {
            state.vocab.push(event);
          }
          break;
        }
        case 'relay.score':
          state.scores[event.turn_id] = event;
          break;
        case 'relay.verdict':
          state.verdict = event;
          break;
        case 'relay.paused':
          state.status = 'paused';
          state.thinkingSpeaker = null;
          break;
        case 'relay.resumed':
          state.status = 'running';
          break;
        case 'relay.observer':
          state.observers.push(event);
          break;
        case 'relay.awaiting_human':
          state.isAwaitingHuman = true;
          state.thinkingSpeaker = null;
          break;
      }
    }

    return state;
  }, [events]);
}

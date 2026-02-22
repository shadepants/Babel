/**
 * Derived experiment state from raw SSE events.
 *
 * Why event sourcing? The SSE events are the single source of truth.
 * UI state is always a pure function of those events — no sync bugs,
 * trivially debuggable, and replaying events for late joiners works
 * automatically (backend's include_history=true parameter).
 */
import { useMemo } from 'react';
import type { RelaySSEEvent, TurnEvent, VocabEvent } from './types';

export interface ExperimentState {
  turns: TurnEvent[];
  vocab: VocabEvent[];
  currentRound: number;
  totalRounds: number;
  thinkingSpeaker: string | null;
  status: 'idle' | 'running' | 'completed' | 'error';
  elapsed: number | null;
  errorMessage: string | null;
}

export function useExperimentState(events: RelaySSEEvent[]): ExperimentState {
  return useMemo(() => {
    const state: ExperimentState = {
      turns: [],
      vocab: [],
      currentRound: 0,
      totalRounds: 0,
      thinkingSpeaker: null,
      status: 'idle',
      elapsed: null,
      errorMessage: null,
    };

    for (const event of events) {
      switch (event.type) {
        case 'relay.thinking':
          state.thinkingSpeaker = event.speaker;
          state.status = 'running';
          break;
        case 'relay.turn':
          state.turns.push(event);
          state.thinkingSpeaker = null;
          state.currentRound = event.round;
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
      }
    }

    return state;
  }, [events]);
}

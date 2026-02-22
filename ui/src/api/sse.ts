/**
 * SSE hook for streaming relay events.
 * Adapted from Factory/ui/src/api/sse.ts — same EventSource pattern,
 * but typed for Babel's RelaySSEEvent union and keyed on match_id.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { RelaySSEEvent } from './types';

export interface UseSSEResult {
  lastEvent: RelaySSEEvent | null;
  events: RelaySSEEvent[];
  connected: boolean;
  error: string | null;
  clearEvents: () => void;
}

export function useSSE(
  matchId?: string | null,
  enabled: boolean = true,
  maxHistory: number = 500,
): UseSSEResult {
  const [lastEvent, setLastEvent] = useState<RelaySSEEvent | null>(null);
  const [events, setEvents] = useState<RelaySSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    if (!enabled || !matchId) {
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
      return;
    }

    const url = `/api/relay/stream?match_id=${encodeURIComponent(matchId)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
      setError(null);
    };

    source.onmessage = (event) => {
      try {
        const parsed: RelaySSEEvent = JSON.parse(event.data);
        setLastEvent(parsed);
        setEvents((prev) => {
          const next = [...prev, parsed];
          return next.length > maxHistory ? next.slice(-maxHistory) : next;
        });
      } catch {
        // Ignore malformed events (keepalives are SSE comments, not data)
      }
    };

    source.onerror = () => {
      setConnected(false);
      setError('Connection lost — reconnecting...');
      // EventSource auto-reconnects natively
    };

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [matchId, enabled, maxHistory]);

  return { lastEvent, events, connected, error, clearEvents };
}

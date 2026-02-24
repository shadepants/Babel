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

    // Guard against React 19 Strict Mode double-mount:
    // Close any existing connection before opening a new one.
    sourceRef.current?.close();

    // Track whether this effect instance is still active.
    // If cleanup runs (unmount or re-render), we stop processing events.
    let cancelled = false;

    const url = `/api/relay/stream?match_id=${encodeURIComponent(matchId)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      if (cancelled) return;
      setConnected(true);
      setError(null);
      // Clear old state so backend history replay doesn't duplicate bubbles
      setEvents([]);
    };

    source.onmessage = (event) => {
      if (cancelled) return;
      try {
        const parsed: RelaySSEEvent = JSON.parse(event.data);
        setLastEvent(parsed);
        setEvents((prev) => {
          // Deduplicate on reconnect: skip events already in history.
          // Turn events have turn_id; other events use type+timestamp.
          if (parsed.type === 'relay.turn') {
            const turnId = (parsed as { turn_id: string }).turn_id;
            if (prev.some((e) => e.type === 'relay.turn' && (e as { turn_id: string }).turn_id === turnId)) {
              return prev;
            }
          }
          const next = [...prev, parsed];
          return next.length > maxHistory ? next.slice(-maxHistory) : next;
        });
      } catch {
        // Ignore malformed events (keepalives are SSE comments, not data)
      }
    };

    source.onerror = () => {
      if (cancelled) return;
      setConnected(false);
      setError('Connection lost — reconnecting...');
      // EventSource auto-reconnects natively
    };

    return () => {
      cancelled = true;
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [matchId, enabled, maxHistory]);

  return { lastEvent, events, connected, error, clearEvents };
}

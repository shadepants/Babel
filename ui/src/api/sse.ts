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

    // Fix #5: Jittered Exponential Backoff state
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRY_DELAY = 10000; // 10s
    const BASE_DELAY = 500;        // 500ms

    function connect() {
      if (cancelled) return;

      // Close any existing connection
      sourceRef.current?.close();

      const url = `/api/relay/stream?match_id=${encodeURIComponent(matchId!)}`;
      const source = new EventSource(url);
      sourceRef.current = source;

      source.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        setError(null);
        retryCount = 0; // Reset backoff on success
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
            if (parsed.type === 'relay.turn') {
              const turnId = (parsed as { turn_id: string }).turn_id;
              if (prev.some((e) => e.type === 'relay.turn' && (e as { turn_id: string }).turn_id === turnId)) {
                return prev;
              }
            }
            const next = [...prev, parsed];
            return next.length > maxHistory ? next.slice(-maxHistory) : next;
          });
        } catch { /* ignore keepalives */ }
      };

      source.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        source.close(); // Force close to stop native auto-retry so we can use our backoff

        // Calculate backoff: min(MAX_DELAY, BASE * 2^count) + random jitter
        const delay = Math.min(MAX_RETRY_DELAY, BASE_DELAY * Math.pow(2, retryCount));
        const jitter = Math.random() * 500;
        
        setError(`Connection lost — retrying in ${Math.round((delay + jitter)/1000)}s...`);
        
        setTimeout(() => {
          if (!cancelled) {
            retryCount++;
            connect();
          }
        }, delay + jitter);
      };
    }

    connect();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [matchId, enabled, maxHistory]);

  return { lastEvent, events, connected, error, clearEvents };
}

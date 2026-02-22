import type { RelayStartRequest, RelayStartResponse, ModelsResponse } from './types';

const REQUEST_TIMEOUT_MS = 15_000;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch JSON with automatic timeout via AbortController.
 * Pattern adapted from Factory/ui/src/api/client.ts.
 */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(response.status, `API error: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  /** Start a new relay experiment */
  startRelay: (body: RelayStartRequest) =>
    fetchJson<RelayStartResponse>('/api/relay/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Get available models from the registry */
  getModels: () => fetchJson<ModelsResponse>('/api/relay/models'),

  /** Get event history (REST fallback for SSE) */
  getHistory: (matchId?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (matchId) params.set('match_id', matchId);
    params.set('limit', String(limit));
    return fetchJson<{ count: number; events: Record<string, unknown>[] }>(
      `/api/relay/history?${params.toString()}`
    );
  },
};

export { ApiError };

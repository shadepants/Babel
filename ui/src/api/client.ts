import type {
  RelayStartRequest,
  RelayStartResponse,
  ModelsResponse,
  PresetsResponse,
  VocabResponse,
  ExperimentRecord,
  ExperimentsListResponse,
  ExperimentStats,
  TurnsResponse,
  TurnScoresResponse,
  TournamentStartRequest,
  TournamentStartResponse,
  TournamentDetail,
  TournamentListResponse,
  TournamentLeaderboard,
  ExperimentRadarResponse,
  ModelStatusResponse,
  EnvStatusResponse,
  TreeNode,
} from './types';

const REQUEST_TIMEOUT_MS = 15_000;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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

  /** Get available experiment presets */
  getPresets: () => fetchJson<PresetsResponse>('/api/presets'),

  /** Get experiment metadata */
  getExperiment: (experimentId: string) =>
    fetchJson<ExperimentRecord>(`/api/experiments/${experimentId}`),

  /** Get vocabulary for an experiment */
  getVocabulary: (experimentId: string) =>
    fetchJson<VocabResponse>(`/api/experiments/${experimentId}/vocabulary`),

  /** Get event history (REST fallback for SSE) */
  getHistory: (matchId?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (matchId) params.set('match_id', matchId);
    params.set('limit', String(limit));
    return fetchJson<{ count: number; events: Record<string, unknown>[] }>(
      `/api/relay/history?${params.toString()}`
    );
  },

  /** List all experiments (Gallery page) */
  listExperiments: (params?: { limit?: number; offset?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.status) query.set('status', params.status);
    return fetchJson<ExperimentsListResponse>(`/api/experiments/?${query.toString()}`);
  },

  /** Get pre-aggregated analytics for an experiment */
  getExperimentStats: (experimentId: string) =>
    fetchJson<ExperimentStats>(`/api/experiments/${experimentId}/stats`),

  /** Get all turns with full content (for export) */
  getExperimentTurns: (experimentId: string) =>
    fetchJson<TurnsResponse>(`/api/experiments/${experimentId}/turns`),

  /** Get radar chart data for an experiment (both models, normalized 0-1) */
  getExperimentRadar: (experimentId: string) =>
    fetchJson<ExperimentRadarResponse>(`/api/experiments/${experimentId}/radar`),

  /** Get judge scores for all turns in an experiment */
  getExperimentScores: (experimentId: string) =>
    fetchJson<TurnScoresResponse>(`/api/experiments/${experimentId}/scores`),

  /** Stop a running experiment */
  /** Pause a running experiment between turns */
  pauseExperiment: (matchId: string) =>
    fetchJson<{ match_id: string; status: string }>(`/api/relay/${matchId}/pause`, { method: 'POST' }),

  /** Resume a paused experiment */
  resumeExperiment: (matchId: string) =>
    fetchJson<{ match_id: string; status: string }>(`/api/relay/${matchId}/resume`, { method: 'POST' }),

  /** Inject a human turn (paused relay or RPG mode) */
  injectTurn: (matchId: string, content: string, speaker?: string) =>
    fetchJson<{ match_id: string; round: number; status: string }>(`/api/relay/${matchId}/inject`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(speaker ? { speaker } : {}) }),
    }),

  /** Stop a running experiment */
  stopExperiment: (matchId: string) =>
    fetchJson<{ match_id: string; status: string }>(`/api/relay/${matchId}/stop`, { method: 'POST' }),

  /** Delete a non-running experiment */
  deleteExperiment: (experimentId: string) =>
    fetchJson<{ deleted: string }>(`/api/experiments/${experimentId}`, { method: 'DELETE' }),

  /** Set or clear a human-readable nickname for an experiment */
  setExperimentLabel: (experimentId: string, label: string | null) =>
    fetchJson<{ id: string; label: string | null }>(`/api/experiments/${experimentId}/label`, {
      method: 'PATCH',
      body: JSON.stringify({ label }),
    }),

  /** Test a provider's API key with a tiny LLM call */
  testProvider: (provider: string) =>
    fetchJson<{ ok: boolean; provider: string; latency_ms?: number; error?: string }>(
      `/api/relay/models/test/${provider}`, { method: 'POST' },
    ),

  /** Check which models have API keys configured */
  getModelStatus: () => fetchJson<ModelStatusResponse>('/api/relay/models/status'),

  /** Check whether a .env file exists at the project root */
  getEnvStatus: () => fetchJson<EnvStatusResponse>('/api/relay/env-status'),

  /** Write an API key to .env and update the server process immediately */
  setApiKey: (envVar: string, value: string) =>
    fetchJson<{ ok: boolean; env_var: string; key_preview: string }>('/api/relay/keys', {
      method: 'POST',
      body: JSON.stringify({ env_var: envVar, value }),
    }),

  // ── Tournament endpoints ──────────────────────────────────

  /** Start a new multi-model tournament */
  startTournament: (body: TournamentStartRequest) =>
    fetchJson<TournamentStartResponse>('/api/tournaments/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Cancel a running tournament */
  cancelTournament: (tournamentId: string) =>
    fetchJson<{ tournament_id: string; status: string }>(`/api/tournaments/${tournamentId}/cancel`, { method: 'POST' }),

  /** List all tournaments */
  listTournaments: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return fetchJson<TournamentListResponse>(`/api/tournaments/?${query.toString()}`);
  },

  /** Get tournament details including match list */
  getTournament: (tournamentId: string) =>
    fetchJson<TournamentDetail>(`/api/tournaments/${tournamentId}`),

  /** Get tournament leaderboard with radar data */
  getTournamentLeaderboard: (tournamentId: string) =>
    fetchJson<TournamentLeaderboard>(`/api/tournaments/${tournamentId}/leaderboard`),

  // ── Phase 15-B: Branch Tree ──────────────────────────────────

  /** Get forking lineage tree rooted at the ancestor of the given experiment */
  getExperimentTree: (experimentId: string) =>
    fetchJson<TreeNode>(`/api/experiments/${experimentId}/tree`),
};

export { ApiError };

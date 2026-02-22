// ── API Request/Response Types ─────────────────────────────────

/** POST /api/relay/start request body */
export interface RelayStartRequest {
  model_a: string;
  model_b: string;
  seed: string;
  system_prompt?: string;
  rounds: number;
  temperature: number;
  max_tokens: number;
  preset?: string;
}

/** POST /api/relay/start response */
export interface RelayStartResponse {
  match_id: string;
  model_a: string;
  model_b: string;
  rounds: number;
  status: string;
}

/** Single model entry from GET /api/relay/models */
export interface ModelInfo {
  name: string;   // Display name, e.g. "Claude Sonnet"
  model: string;  // litellm string, e.g. "anthropic/claude-sonnet-4-20250514"
}

/** GET /api/relay/models response */
export interface ModelsResponse {
  models: ModelInfo[];
}

// ── SSE Event Types ────────────────────────────────────────────
// Matches RelayEvent constants in server/relay_engine.py:33-40
// and event payloads published throughout run_relay()

/** Every SSE event has these fields */
export interface BaseSSEEvent {
  type: string;
  timestamp: number;
  match_id: string;
}

/** relay.thinking — model is generating */
export interface ThinkingEvent extends BaseSSEEvent {
  type: 'relay.thinking';
  speaker: string;
  model: string;
  round: number;
}

/** relay.turn — completed turn with content */
export interface TurnEvent extends BaseSSEEvent {
  type: 'relay.turn';
  round: number;
  speaker: string;
  model: string;
  content: string;
  latency_s: number;
  turn_id: string;
}

/** relay.round — both models finished a round */
export interface RoundCompleteEvent extends BaseSSEEvent {
  type: 'relay.round';
  round: number;
  rounds_total: number;
}

/** relay.done — all rounds finished */
export interface MatchCompleteEvent extends BaseSSEEvent {
  type: 'relay.done';
  rounds: number;
  elapsed_s: number;
}

/** relay.error — something went wrong */
export interface ErrorEvent extends BaseSSEEvent {
  type: 'relay.error';
  message: string;
}

/** relay.vocab — a new or re-encountered invented word */
export interface VocabEvent extends BaseSSEEvent {
  type: 'relay.vocab';
  word: string;
  meaning: string | null;
  coined_by: string;
  coined_round: number;
  category: string | null;
  parent_words: string[];
}

/** Discriminated union — switch on `type` for type narrowing */
export type RelaySSEEvent =
  | ThinkingEvent
  | TurnEvent
  | RoundCompleteEvent
  | MatchCompleteEvent
  | ErrorEvent
  | VocabEvent;

// ── Preset Types ─────────────────────────────────────────────

/** Single preset from GET /api/presets */
export interface Preset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  seed: string;
  system_prompt: string;
  defaults: {
    rounds: number;
    temperature: number;
    max_tokens: number;
  };
  suggested_models: {
    a: string;  // display name like "Claude Sonnet"
    b: string;
  };
  tags: string[];
}

/** GET /api/presets response */
export interface PresetsResponse {
  presets: Preset[];
}

// ── REST Response Types ───────────────────────────────────────

/** Single vocabulary word from REST endpoint */
export interface VocabWord {
  id: number;
  experiment_id: string;
  word: string;
  meaning: string | null;
  coined_by: string;
  coined_round: number;
  category: string | null;
  usage_count: number;
  parent_words: string[] | null;
}

/** GET /api/experiments/:id/vocabulary response */
export interface VocabResponse {
  experiment_id: string;
  words: VocabWord[];
}

/** Experiment record from REST endpoint */
export interface ExperimentRecord {
  id: string;
  created_at: string;
  model_a: string;
  model_b: string;
  preset: string | null;
  seed: string;
  rounds_planned: number;
  rounds_completed: number;
  status: string;
  elapsed_seconds: number | null;
}

/** GET /api/experiments/ response */
export interface ExperimentsListResponse {
  experiments: ExperimentRecord[];
}

// ── Analytics Types ─────────────────────────────────────────────

/** Per-round latency and token breakdown by model */
export interface TurnStatRow {
  round: number;
  model_a_latency: number | null;
  model_b_latency: number | null;
  model_a_tokens: number | null;
  model_b_tokens: number | null;
}

/** Cumulative vocabulary count at a given round */
export interface VocabGrowthRow {
  round: number;
  cumulative_count: number;
}

/** GET /api/experiments/:id/stats response */
export interface ExperimentStats {
  turns_by_round: TurnStatRow[];
  vocab_by_round: VocabGrowthRow[];
  totals: {
    total_turns: number;
    total_tokens: number;
    avg_latency_a: number | null;
    avg_latency_b: number | null;
    vocab_count: number;
  };
}

/** Single turn record (for export) */
export interface TurnRecord {
  id: number;
  round: number;
  speaker: string;
  model: string;
  content: string;
  latency_seconds: number | null;
  token_count: number | null;
  created_at: string;
}

/** GET /api/experiments/:id/turns response */
export interface TurnsResponse {
  experiment_id: string;
  turns: TurnRecord[];
}

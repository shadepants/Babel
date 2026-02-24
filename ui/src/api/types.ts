// ── API Request/Response Types ─────────────────────────────────

/** POST /api/relay/start request body */
export interface RelayStartRequest {
  model_a: string;
  model_b: string;
  seed: string;
  system_prompt?: string;
  rounds: number;
  temperature_a: number;
  temperature_b: number;
  max_tokens: number;
  turn_delay_seconds?: number;
  preset?: string;
  judge_model?: string | null;
  enable_scoring?: boolean;
  enable_verdict?: boolean;
  enable_memory?: boolean;
  observer_model?: string | null;
  observer_interval?: number;
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

/** relay.score — judge scored a single turn (fires async after turn event) */
export interface ScoreEvent extends BaseSSEEvent {
  type: 'relay.score';
  turn_id: number;
  creativity: number;
  coherence: number;
  engagement: number;
  novelty: number;
}

/** relay.verdict — judge declared a final winner after all rounds */
export interface VerdictEvent extends BaseSSEEvent {
  type: 'relay.verdict';
  winner: 'model_a' | 'model_b' | 'tie';
  winner_model: string;  // litellm model string of the winner, or 'tie'
  reasoning: string;
}

/** Discriminated union — switch on `type` for type narrowing */
/** relay.paused — relay is waiting at a checkpoint */
export interface PausedEvent extends BaseSSEEvent {
  type: 'relay.paused';
  round: number;
}

/** relay.resumed — relay has resumed after a pause */
export interface ResumedEvent extends BaseSSEEvent {
  type: 'relay.resumed';
  round: number;
}

/** relay.observer — neutral observer commentary */
export interface ObserverEvent extends BaseSSEEvent {
  type: 'relay.observer';
  speaker: 'Observer';
  model: string;
  content: string;
  after_turn: number;
}

/** Discriminated union — switch on `type` for type narrowing */
export type RelaySSEEvent =
  | ThinkingEvent
  | TurnEvent
  | RoundCompleteEvent
  | MatchCompleteEvent
  | ErrorEvent
  | VocabEvent
  | ScoreEvent
  | VerdictEvent
  | PausedEvent
  | ResumedEvent
  | ObserverEvent;

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
  confidence: string | null;
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
  temperature_a?: number;
  temperature_b?: number;
  judge_model?: string | null;
  enable_scoring?: boolean;
  enable_verdict?: boolean;
  winner?: string | null;
  verdict_reasoning?: string | null;
  label?: string | null;
}

/** Single turn score from GET /api/experiments/:id/scores */
export interface TurnScore {
  turn_id: number;
  creativity: number;
  coherence: number;
  engagement: number;
  novelty: number;
  scored_at: string;
}

/** GET /api/experiments/:id/scores response */
export interface TurnScoresResponse {
  experiment_id: string;
  scores: TurnScore[];
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

// ── Tournament Types ─────────────────────────────────────────

/** POST /api/tournaments/start request body */
export interface TournamentStartRequest {
  name: string;
  models: string[];       // litellm model strings (min 3)
  preset?: string;
  seed: string;
  system_prompt: string;
  rounds: number;
  temperature: number;
  max_tokens: number;
}

/** POST /api/tournaments/start response */
export interface TournamentStartResponse {
  tournament_id: string;
  name: string;
  total_matches: number;
  models: string[];
  status: string;
}

/** Tournament record from REST */
export interface TournamentRecord {
  id: string;
  name: string;
  preset: string | null;
  models: string[];
  status: string;
  total_matches: number;
  completed_matches: number;
  created_at: string;
  rounds: number;
}

/** Single match within a tournament */
export interface TournamentMatch {
  id: number;
  tournament_id: string;
  experiment_id: string | null;
  model_a: string;
  model_b: string;
  match_order: number;
  status: string;
}

/** GET /api/tournaments/:id response (tournament + matches) */
export interface TournamentDetail extends TournamentRecord {
  matches: TournamentMatch[];
}

/** GET /api/tournaments/ response */
export interface TournamentListResponse {
  tournaments: TournamentRecord[];
}

/** Single entry in the tournament leaderboard */
export interface LeaderboardEntry {
  model: string;
  display_name: string;
  matches_played: number;
  avg_latency: number | null;
  avg_tokens: number | null;
  total_vocab_coined: number;
  // Radar chart axes (normalized 0-1)
  verbosity: number;
  speed: number;
  creativity: number;
  consistency: number;
  engagement: number;
}

/** GET /api/tournaments/:id/leaderboard response */
export interface TournamentLeaderboard {
  tournament_id: string;
  entries: LeaderboardEntry[];
}

// ── Tournament SSE Events ────────────────────────────────────

export interface TournamentMatchStartedEvent extends BaseSSEEvent {
  type: 'tournament.match_started';
  tournament_id: string;
  match_order: number;
  total_matches: number;
  model_a: string;
  model_b: string;
  experiment_id: string;
}

export interface TournamentMatchCompleteEvent extends BaseSSEEvent {
  type: 'tournament.match_complete';
  tournament_id: string;
  match_order: number;
  total_matches: number;
  experiment_id: string;
}

export interface TournamentCompleteEvent extends BaseSSEEvent {
  type: 'tournament.complete';
  tournament_id: string;
  total_matches: number;
  elapsed_s: number;
}

export interface TournamentErrorEvent extends BaseSSEEvent {
  type: 'tournament.error';
  tournament_id: string;
  message: string;
}

export type TournamentSSEEvent =
  | TournamentMatchStartedEvent
  | TournamentMatchCompleteEvent
  | TournamentCompleteEvent
  | TournamentErrorEvent;

// ── Radar Chart Types ────────────────────────────────────────

/** One axis value for the radar chart */
export interface RadarAxis {
  axis: string;
  value: number; // 0 to 1
}

/** One model's polygon on the radar chart */
export interface RadarDataPoint {
  model: string;
  display_name: string;
  color: string;
  axes: RadarAxis[];
}

/** GET /api/experiments/:id/radar response */
export interface ExperimentRadarResponse {
  experiment_id: string;
  models: RadarModelEntry[];
}

/** Single model entry from radar endpoint (raw from backend) */
export interface RadarModelEntry {
  model: string;
  display_name: string;
  verbosity: number;
  speed: number;
  creativity: number;
  consistency: number;
  engagement: number;
}

/** Model status from GET /api/relay/models/status */
export interface ModelStatusInfo {
  name: string;
  model: string;
  provider: string;
  available: boolean;
  env_var: string;
  key_preview: string | null;  // first4...last4 of loaded key, null if not set
}

/** GET /api/relay/env-status response */
export interface EnvStatusResponse {
  env_file_found: boolean;
}

export interface ModelStatusResponse {
  models: ModelStatusInfo[];
}

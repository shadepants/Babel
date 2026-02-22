// ── API Request/Response Types ─────────────────────────────────

/** POST /api/relay/start request body */
export interface RelayStartRequest {
  model_a: string;
  model_b: string;
  seed: string;
  system_prompt: string;
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

/** Discriminated union — switch on `type` for type narrowing */
export type RelaySSEEvent =
  | ThinkingEvent
  | TurnEvent
  | RoundCompleteEvent
  | MatchCompleteEvent
  | ErrorEvent;

"""Babel configuration -- settings, defaults, and model registry."""

import datetime
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

from dotenv import load_dotenv

if TYPE_CHECKING:
    import asyncio

# Load .env from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


# -- Defaults ----------------------------------------------------------------

DEFAULT_MODEL_A = "anthropic/claude-sonnet-4-5-20250929"
DEFAULT_MODEL_B = "gemini/gemini-2.5-flash"

DEFAULT_SEED = (
    "I propose we build a shared symbolic language. Here are our first three words:\n"
    "- ZYLOK = hello / goodbye\n"
    "- KRAVT = yes / agreed\n"
    "- KLAMA = understood\n\n"
    "Please extend this vocabulary. Add new words, propose grammar rules, "
    "and start using the language."
)

DEFAULT_SYSTEM_PROMPT = (
    "You are collaborating with another AI model to co-create a symbolic "
    "language from scratch. Your goal is to extend the shared vocabulary, "
    "propose grammar rules, and gradually start communicating in the invented "
    "language. Be creative but consistent -- build on what exists, don't "
    "contradict agreed symbols. When you add new words, explain their meaning "
    "briefly. As the language grows, try to use it more and natural language less."
)

DEFAULT_RPG_SYSTEM_PROMPT = (
    "You are participating in a collaborative tabletop RPG session. "
    "Read the campaign parameters and your role carefully. "
    "Stay in character at all times -- describe actions, speak dialogue, "
    "and react to the unfolding story. Keep responses focused and "
    "concise. Build on what other participants have established. "
    "Do not invent meta-languages or constructed vocabularies unless "
    "the campaign explicitly calls for it.\n\n"
    "NARRATOR DISCIPLINE (DM only): You are the narrator and game master. "
    "Never speak in first person as any player character. "
    "Do not write labeled [Character]: turns or dialogue blocks for player characters "
    "inside your narration -- player characters speak for themselves on their own turns. "
    "This includes third-person labeled turns like [Name]: or (Name): written "
    "inside your own narration block. "
    "Report NPC dialogue in quoted form: 'The guard says, \"Halt!\"' "
    "Do not invent named characters beyond those in the party roster and "
    "the campaign hook. Guide the story through the players' actions."
)

# -- RPG Role-Specific Prompts -----------------------------------------------
# Injected per actor based on their role in the session.

COMPANION_SYSTEM_PROMPT = (
    "You are a player character in a collaborative tabletop RPG. "
    "Play ONLY your own character -- their actions, reactions, spoken dialogue, "
    "and inner thoughts. Do NOT narrate the world, describe other party members' "
    "actions, or speak for NPCs. Respond only as your character would in this moment. "
    "Be vivid and specific: name what your character does, says, and feels. "
    "React to what other characters have said and done. "
    "Stay in character at all times. Keep your turn focused and let others react."
)

# -- RPG Action Menu Templates -----------------------------------------------
# Fallback action choices per character class when LLM generation fails.
# Keys match char_class values set in participants JSON.

CLASS_ACTION_TEMPLATES: dict[str, list[str]] = {
    "Fighter":  ["Attack the nearest enemy", "Defend and shield an ally", "Intimidate the opposition", "Assess the tactical situation"],
    "Barbarian": ["Rage and charge", "Smash through the obstacle", "Intimidate with a war cry", "Protect a fallen ally"],
    "Rogue":    ["Strike from the shadows", "Pick a pocket or lock", "Slip away unnoticed", "Negotiate a way out"],
    "Ranger":   ["Fire a precise shot", "Track the enemy's path", "Set a trap", "Communicate with wildlife"],
    "Wizard":   ["Cast a prepared spell", "Analyze the arcane situation", "Search for hidden knowledge", "Flee and regroup"],
    "Sorcerer": ["Unleash raw magic", "Charm or deceive", "Sense magical auras", "Improvise a spell effect"],
    "Warlock":  ["Invoke your patron's power", "Threaten with dark knowledge", "Eldritch blast", "Make a dark bargain"],
    "Cleric":   ["Heal a wounded ally", "Channel divine power", "Bless the party", "Confront evil directly"],
    "Paladin":  ["Smite the enemy", "Lay on hands to heal", "Issue a divine challenge", "Protect the innocent"],
    "Druid":    ["Shapeshift or wild shape", "Commune with nature", "Call upon natural forces", "Tend to the wounded"],
    "Bard":     ["Inspire allies with a performance", "Charm or deceive an NPC", "Gather information cleverly", "Use magic to distract"],
    "Monk":     ["Strike with precise ki", "Deflect an incoming attack", "Move with supernatural speed", "Meditate to sense danger"],
    "default":  ["Attack decisively", "Talk your way through it", "Investigate the situation", "Flee and find another angle"],
}


DEFAULT_ROUNDS = 5
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 1500

# -- Judge / Scoring Defaults ------------------------------------------------
# judge_model is used for per-turn scoring and final verdicts.
# Both features are opt-in (disabled by default).
# Override via JUDGE_MODEL env var in .env (default: Haiku 4.5 for cost efficiency).

JUDGE_MODEL = os.getenv("JUDGE_MODEL", "gemini/gemini-2.5-flash")
DEFAULT_SCORING_ENABLED = False
DEFAULT_VERDICT_ENABLED = False


# -- Model Version Snapshot --------------------------------------------------
# Spec 019: resolve the most specific version identifier available at launch.

_DATE_PATTERN = re.compile(r'\b(\d{8})\b')  # matches YYYYMMDD in model strings


def resolve_model_version(model_string: str) -> str:
    """Return the most specific version identifier available for this model.

    For date-stamped model strings (e.g. Anthropic), the date suffix IS the
    version checkpoint. For all other models, return model_string@YYYY-MM-DD
    as a launch-date proxy so experiments are at least date-bracketed.

    Never raises -- returns the bare model_string as an absolute fallback.

    Examples:
        "anthropic/claude-haiku-4-5-20251001"  ->  "anthropic/claude-haiku-4-5-20251001@2025-10-01"
        "gemini/gemini-2.5-flash"              ->  "gemini/gemini-2.5-flash@2026-03-01"  (today)
    """
    try:
        if m := _DATE_PATTERN.search(model_string):
            raw = m.group(1)                        # e.g. "20251001"
            formatted = f"{raw[:4]}-{raw[4:6]}-{raw[6:]}"
            return f"{model_string}@{formatted}"
        today = datetime.date.today().isoformat()
        return f"{model_string}@{today}"
    except Exception:
        return model_string                         # never lose the launch


# -- RelayConfig -------------------------------------------------------------
# Consolidates the optional feature-flag parameters for run_relay().
# Pass an instance to run_relay() instead of 20+ individual keyword args.
# All fields mirror the existing run_relay() keyword arguments exactly so
# callers can construct this from request body fields without logic changes.

@dataclass
class RelayConfig:
    """Optional feature flags and settings for a relay session.

    Required operational params (match_id, agents, hub, db, seed,
    system_prompt, rounds) remain as direct run_relay() parameters.
    Everything else lives here.
    """
    # Timing
    turn_delay_seconds: float = 2.0

    # Recovery / resume
    start_round: int = 1
    initial_history: list[dict] = field(default_factory=list)

    # Experiment metadata
    preset: str | None = None
    parent_experiment_id: str | None = None

    # Pause / cancel (passed as events, not serializable -- set at call time)
    cancel_event: object = None   # asyncio.Event | None
    resume_event: object = None   # asyncio.Event | None

    # Background task tracking
    background_tasks: object = None  # set[asyncio.Task] | None

    # Judge / scoring
    judge_model: str = field(default_factory=lambda: JUDGE_MODEL)
    enable_scoring: bool = False
    enable_verdict: bool = False

    # Memory
    enable_memory: bool = False

    # Echo chamber detection
    enable_echo_detector: bool = False
    enable_echo_intervention: bool = False
    echo_warn_threshold: float = 0.65
    echo_intervene_threshold: float = 0.88

    # Adversarial mode (Feature 6)
    hidden_goals: list[dict] = field(default_factory=list)
    revelation_round: int | None = None

    # Linguistic evolution (Feature 2)
    vocabulary_seed: list[dict] = field(default_factory=list)

    # Recursive audit (Feature 1)
    enable_audit: bool = False

    # Observer (future use)
    observer_model: str | None = None
    observer_interval: int = 3

    # Spec 005: Hypothesis Testing Mode
    hypothesis: str | None = None


@dataclass
class RPGConfig:
    """Run parameters for an RPG session.

    Infrastructure params (hub, db, cancel_event, human_event, background_tasks)
    remain as direct run_rpg_match() arguments since they are not serialisable.
    Everything else lives here so the call site stays clean.
    """
    # Required run parameters
    participants: list[dict] = field(default_factory=list)
    seed: str = ""
    system_prompt: str = ""
    rounds: int = 5

    # Campaign identity
    preset: str | None = None
    participant_persona_ids: list[str | None] | None = None

    # Campaign settings (tone, setting, difficulty, hook from RPG config panel)
    campaign_config: dict | None = None

    # Recovery: resume from mid-session (used by recover_stale_sessions)
    start_round: int = 1
    start_index: int = 0


# -- Model Registry ----------------------------------------------------------
# Display name -> litellm model string.
# litellm handles provider routing via the prefix (anthropic/, gemini/, etc.)

MODEL_REGISTRY: dict[str, str] = {
    # -- Anthropic -------------------------------------------------------
    "Claude Haiku 4.5":    "anthropic/claude-haiku-4-5-20251001",
    "Claude Sonnet 4.5":   "anthropic/claude-sonnet-4-5-20250929",
    "Claude Opus 4.5":     "anthropic/claude-opus-4-5-20251101",
    # -- Google ----------------------------------------------------------
    "Gemini Flash":        "gemini/gemini-2.5-flash",
    "Gemini Flash Lite":   "gemini/gemini-2.5-flash-lite",   # 1000 RPD free, lower latency
    "Gemini Pro":          "gemini/gemini-2.5-pro",
    # -- OpenAI ----------------------------------------------------------
    "GPT-4.1 Nano":        "openai/gpt-4.1-nano",            # cheapest/fastest OpenAI tier
    "GPT-4.1 Mini":        "openai/gpt-4.1-mini",
    "GPT-4.1":             "openai/gpt-4.1",
    # -- DeepSeek --------------------------------------------------------
    "DeepSeek Chat":       "deepseek/deepseek-chat",
    "DeepSeek R1":         "deepseek/deepseek-reasoner",
    # -- Groq (Llama / fast inference) -----------------------------------
    "Llama 3.3 70B":       "groq/llama-3.3-70b-versatile",   # free tier, Cerebras fallback
    "Llama 4 Scout":       "groq/meta-llama/llama-4-scout-17b-16e-instruct",
    "Llama 4 Maverick":    "groq/meta-llama/llama-4-maverick-17b-128e-instruct",
    # -- Mistral ---------------------------------------------------------
    "Mistral Small":       "mistral/mistral-small-latest",
    "Mistral Large":       "mistral/mistral-large-latest",
    # -- OpenRouter (needs OPENROUTER_API_KEY) ---------------------------
    "Qwen 3 32B":          "openrouter/qwen/qwen3-32b",
    # -- AI21 (needs AI21_API_KEY in .env) -------------------------------
    "Jamba 1.5":           "ai21/jamba-1.5-large",
}


def get_display_name(model_string: str) -> str:
    """Get a human-friendly name from a litellm model string.

    Checks the registry first, then falls back to extracting the
    model name after the provider prefix.
    """
    # Check registry (reverse lookup)
    for name, model in MODEL_REGISTRY.items():
        if model == model_string:
            return name
    # Fallback: strip provider prefix
    return model_string.split("/")[-1] if "/" in model_string else model_string

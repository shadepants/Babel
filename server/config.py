"""Babel configuration — settings, defaults, and model registry."""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


# ── Defaults ────────────────────────────────────────────────────────────

DEFAULT_MODEL_A = "anthropic/claude-sonnet-4-20250514"
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
    "language. Be creative but consistent — build on what exists, don't "
    "contradict agreed symbols. When you add new words, explain their meaning "
    "briefly. As the language grows, try to use it more and natural language less."
)

DEFAULT_ROUNDS = 5
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 1500

# ── Judge / Scoring Defaults ────────────────────────────────────────────
# judge_model is used for per-turn scoring and final verdicts.
# Both features are opt-in (disabled by default).

JUDGE_MODEL = "gemini/gemini-2.5-flash"
DEFAULT_SCORING_ENABLED = False
DEFAULT_VERDICT_ENABLED = False


# ── Model Registry ─────────────────────────────────────────────────────
# Display name → litellm model string.
# litellm handles provider routing via the prefix (anthropic/, gemini/, etc.)

MODEL_REGISTRY: dict[str, str] = {
    "Claude Sonnet": "anthropic/claude-sonnet-4-20250514",
    "Gemini Flash": "gemini/gemini-2.5-flash",
    "DeepSeek Chat": "deepseek/deepseek-chat",
    "Llama 3.3 70B": "groq/llama-3.3-70b-versatile",
    "Mistral Large": "mistral/mistral-large-latest",
    "Gemini Pro": "gemini/gemini-2.5-pro",
    "GPT-4o Mini": "openai/gpt-4o-mini",
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

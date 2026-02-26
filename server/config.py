"""Babel configuration -- settings, defaults, and model registry."""

from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


# -- Defaults ----------------------------------------------------------------

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

JUDGE_MODEL = "gemini/gemini-2.5-flash"
DEFAULT_SCORING_ENABLED = False
DEFAULT_VERDICT_ENABLED = False


# -- Model Registry ----------------------------------------------------------
# Display name -> litellm model string.
# litellm handles provider routing via the prefix (anthropic/, gemini/, etc.)

MODEL_REGISTRY: dict[str, str] = {
    # -- Anthropic -------------------------------------------------------
    "Claude Haiku 4.5":  "anthropic/claude-haiku-4-5-20251001",
    "Claude Sonnet":     "anthropic/claude-sonnet-4-20250514",
    "Claude Opus 4":     "anthropic/claude-opus-4-5",
    # -- Google ----------------------------------------------------------
    "Gemini Flash":      "gemini/gemini-2.5-flash",
    "Gemini Pro":        "gemini/gemini-2.5-pro",
    # -- OpenAI ----------------------------------------------------------
    "GPT-4o Mini":       "openai/gpt-4o-mini",
    "GPT-4o":            "openai/gpt-4o",
    # -- DeepSeek --------------------------------------------------------
    "DeepSeek Chat":     "deepseek/deepseek-chat",
    "DeepSeek R1":       "deepseek/deepseek-reasoner",
    # -- Groq (Llama / fast inference) -----------------------------------
    "Llama 3.3 70B":     "groq/llama-3.3-70b-versatile",
    # -- Mistral ---------------------------------------------------------
    "Mistral Small":     "mistral/mistral-small-latest",
    "Mistral Large":     "mistral/mistral-large-latest",
    # -- OpenRouter (needs OPENROUTER_API_KEY) ---------------------------
    "Command R+":        "openrouter/cohere/command-r-plus",
    "Qwen 2.5 72B":      "openrouter/qwen/qwen-2.5-72b-instruct",
    # -- AI21 (needs AI21_API_KEY in .env) -------------------------------
    "Jamba 1.5":         "ai21/jamba-1.5-large",
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

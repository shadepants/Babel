"""Vocabulary extractor -- regex-based detection of invented words in AI conversations.

Scans turn content for invented vocabulary using two strategies:
1. Explicit definitions: "WORD = meaning", "WORD: meaning", "propose WORD to mean ..."
   Also handles Unicode symbol definitions: "symbol = meaning"
2. ALL_CAPS tokens (3+ chars) not in a common-word blocklist
   Also handles standalone Unicode symbols in conlang mode

Pass 1 matches are high-confidence; Pass 2 (ALL_CAPS / symbol catch-all) is low-confidence
and can be disabled for non-conlang presets to reduce false positives.

Returns ExtractedWord dataclasses ready for db.upsert_word() and SSE publishing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# -- Data -----------------------------------------------------------------------


@dataclass
class ExtractedWord:
    """A single extracted vocabulary entry."""
    word: str                          # normalized uppercase for ASCII words; kept as-is for symbols
    meaning: str | None = None
    category: str | None = None        # "noun" | "verb" | "prefix" | "grammar" | ...
    parent_words: list[str] = field(default_factory=list)
    confidence: str = "high"           # "high" (Pass 1) or "low" (Pass 2)


# -- Patterns -------------------------------------------------------------------

# Pattern 1a: WORD = meaning  or  WORD: meaning  (line-start or after bullet)
_DEFINITION_RE = re.compile(
    r"(?:^|[-*\u2022]\s*)"             # start of line or bullet (including unicode bullet)
    r"([A-Z][A-Z0-9\-]{2,})"          # the word (3+ chars, uppercase)
    r"\s*[=:]\s*"                      # separator
    r"(.+?)(?:\n|$)",                  # meaning (rest of line)
    re.MULTILINE,
)

# Pattern 1b: "propose/call/define WORD to mean X"
_PROPOSE_RE = re.compile(
    r"(?:propose|call|define|introduce|use|coin|suggest)\s+"
    r"(?:the\s+(?:word|term|symbol|glyph)\s+)?"
    r"[\"']?([A-Z][A-Z0-9\-]{2,})[\"']?"
    r"\s*(?:to\s+mean|means?|as|=|for)\s*"
    r"(.+?)(?:[.,;!\n]|$)",
    re.IGNORECASE,
)

# Pattern 1c: WORD (meaning 'definition') or WORD (a word for 'X')
_PARENTHETICAL_RE = re.compile(
    r"([A-Z][A-Z0-9\-]{2,})"          # the word
    r"\s*\(\s*"                        # opening paren
    r"(?:meaning|a\s+word\s+for|literally|i\.?e\.?|from)\s+"
    r"[\"']?(.+?)[\"']?"              # definition inside parens
    r"\s*\)",                          # closing paren
    re.IGNORECASE,
)

# Pattern 1d: "I'll use/call/name WORD to mean/for X"
_INLINE_DEF_RE = re.compile(
    r"(?:I(?:'ll|'d|'ve)?\s+(?:call|use|name|coin|introduce))\s+"
    r"[\"']?([A-Z][A-Z0-9\-]{2,})[\"']?"
    r"\s+(?:to\s+mean|for|as)\s+"
    r"(.+?)(?:[.,;!\n]|$)",
    re.IGNORECASE,
)

# Pattern 1e: Unicode symbol definitions -- matches glyphs like ⊙, ∅, ∴, ∞, ⧈
# Covers common Unicode symbol ranges used in conlang/symbolic languages:
#   \u2190-\u21FF  Arrows
#   \u2200-\u22FF  Mathematical Operators
#   \u2300-\u23FF  Miscellaneous Technical
#   \u2400-\u243F  Control Pictures
#   \u2500-\u259F  Box Drawing, Block Elements
#   \u25A0-\u25FF  Geometric Shapes
#   \u2600-\u26FF  Miscellaneous Symbols
#   \u2700-\u27BF  Dingbats
#   \u27C0-\u27FF  Misc Math Symbols-A
#   \u2900-\u297F  Supplemental Arrows-B
#   \u2980-\u29FF  Misc Math Symbols-B
#   \u2A00-\u2AFF  Supplemental Math Operators
#   \u2B00-\u2BFF  Misc Symbols and Arrows
_SYMBOL_CHARS = (
    "\u2190-\u21FF"  # Arrows
    "\u2200-\u22FF"  # Math Operators
    "\u2300-\u23FF"  # Misc Technical
    "\u2500-\u25FF"  # Box Drawing + Geometric Shapes
    "\u2600-\u26FF"  # Misc Symbols
    "\u2700-\u27FF"  # Dingbats + Misc Math A
    "\u2900-\u2AFF"  # Supplemental Arrows + Math
    "\u2B00-\u2BFF"  # Misc Symbols and Arrows
)

_SYMBOL_DEF_RE = re.compile(
    r"(?:^|[-*\u2022]\s*)"
    r"([" + _SYMBOL_CHARS + r"]{1,4})"   # 1-4 symbol chars
    r"\s*[=:]\s*"
    r"(.+?)(?:\n|$)",
    re.MULTILINE,
)

# Pattern 1f: symbol followed by parenthetical meaning
_SYMBOL_PAREN_RE = re.compile(
    r"([" + _SYMBOL_CHARS + r"]{1,4})"
    r"\s*\(\s*"
    r"(?:meaning|a\s+(?:word|symbol)\s+for|=|is\s+)?"
    r"[\"']?(.+?)[\"']?"
    r"\s*\)",
    re.IGNORECASE,
)

# Pattern 2: Standalone ALL_CAPS tokens (3+ chars)
_ALLCAPS_RE = re.compile(r"\b([A-Z][A-Z0-9\-]{2,})\b")

# Pattern 2b: Standalone Unicode symbols (for Pass 2 re-use tracking)
_SYMBOL_RE = re.compile(
    r"(?<!\w)([" + _SYMBOL_CHARS + r"]{1,4})(?!\w)"
)

# Category markers -- if these appear right before/after a word, tag the category
_CATEGORY_RE = re.compile(
    r"(?:^|[\s(])"
    r"(noun|verb|adjective|adverb|prefix|suffix|particle|conjunction|grammar|greeting|symbol|glyph|operator)"
    r"(?:[\s):]|$)",
    re.IGNORECASE,
)

# Common English words and acronyms to ignore
_BLOCKLIST = frozenset({
    # Acronyms
    "AI", "LLM", "API", "SSE", "URL", "HTTP", "JSON", "HTML",
    "CSS", "DOM", "SDK", "IDE", "NLP", "GPT", "SQL", "XML",
    # Common 3-letter English words (uppercase in headers/emphasis)
    "THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL",
    "CAN", "HER", "WAS", "ONE", "OUR", "OUT", "DAY", "GET",
    "HAS", "HIM", "HIS", "HOW", "ITS", "MAY", "NEW", "NOW",
    "OLD", "SEE", "TWO", "WAY", "WHO", "BOY", "DID", "LET",
    "PUT", "SAY", "SHE", "TOO", "USE", "MAN", "RUN", "SET",
    "TRY", "ASK", "OWN", "WHY", "BIG", "FEW", "END", "FAR",
    # Common 4+ letter English words
    "ALSO", "BACK", "BEEN", "BOTH", "CALL", "COME", "EACH",
    "EVEN", "FIND", "FIRST", "FROM", "GIVE", "GOOD", "GREAT",
    "HAVE", "HERE", "HIGH", "JUST", "KEEP", "KNOW", "LAST",
    "LIKE", "LONG", "LOOK", "MADE", "MAKE", "MANY", "MORE",
    "MOST", "MUCH", "MUST", "NAME", "NEED", "NEXT", "ONLY",
    "OVER", "PART", "SAME", "SHOW", "SOME", "SUCH", "TAKE",
    "TELL", "THAN", "THAT", "THEM", "THEN", "THEY", "THIS",
    "TIME", "TURN", "USED", "VERY", "WANT", "WELL", "WERE",
    "WHAT", "WHEN", "WILL", "WITH", "WORD", "WORK", "YEAR",
    "YOUR", "THINK", "ABOUT", "AFTER", "AGAIN", "BEING",
    "COULD", "EVERY", "GOING", "WOULD", "SHOULD", "THESE",
    "THOSE", "THEIR", "THERE", "WHICH", "WHERE", "WHILE",
    "WORLD", "STILL", "OTHER", "NEVER", "USING", "SHALL",
    # Words likely in language-building context (not invented)
    "LANGUAGE", "GRAMMAR", "SYNTAX", "SEMANTIC", "MEANING",
    "WORDS", "VOCABULARY", "TRANSLATION", "EXAMPLE",
    "HELLO", "GOODBYE", "PLEASE", "THANK", "THANKS",
    "NOTE", "ROUND", "RULES", "RULE", "PROPOSE", "DEFINE",
    # Additional false-positive blocklist (common in non-conlang presets)
    "TRUE", "FALSE", "NULL", "STEP", "CASE", "POINT",
    "EDIT", "IDEA", "FACT", "REAL", "SURE", "BEST",
    "DOES", "DONE", "WILL", "SAID", "SAYS", "FORM",
    "MOVE", "PLAN", "TYPE", "DATA", "GOAL", "ROLE",
    "SIDE", "VIEW", "HELP", "LEFT", "PLAY", "ABLE",
    "FULL", "HEAD", "MIND", "OPEN", "LEAD", "TERM",
})

# Presets where ALL_CAPS catch-all (Pass 2) is useful -- conlang / vocab-heavy modes
_CONLANG_PRESETS = frozenset({
    "conlang", "original", "emoji-to-language", "code-breaker", None,  # None = custom (allow by default)
})


# -- Extraction Logic -----------------------------------------------------------


def extract_vocabulary(
    content: str,
    known_words: set[str],
    speaker: str,
    round_num: int,
    preset: str | None = None,
) -> list[ExtractedWord]:
    """Parse a single turn's text for invented vocabulary.

    Args:
        content: Raw text of the model's response.
        known_words: Uppercase set of previously catalogued words.
            Used to detect parent_words references and re-encounters.
        speaker: Display name of the model that produced this turn.
        round_num: Current round number.
        preset: Preset name (e.g. "conlang", "debate", "story").
            Non-conlang presets disable Pass 2 (ALL_CAPS catch-all)
            to reduce false positives.

    Returns:
        List of ExtractedWord entries. May be empty.
    """
    found: dict[str, ExtractedWord] = {}  # word/symbol -> ExtractedWord, deduped

    # -- Pass 1: Explicit definitions (high confidence) --

    # ASCII word definitions
    for regex in (_DEFINITION_RE, _PROPOSE_RE, _PARENTHETICAL_RE, _INLINE_DEF_RE):
        for match in regex.finditer(content):
            word = match.group(1).upper().strip("-")
            meaning = match.group(2).strip()[:200]

            if word in _BLOCKLIST or len(word) < 3:
                continue

            if word not in found:
                parents = [p for p in _find_parent_words(meaning, known_words) if p != word]
                category = _detect_category(content, match.start(), match.end())
                found[word] = ExtractedWord(
                    word=word,
                    meaning=meaning if meaning else None,
                    category=category,
                    parent_words=parents,
                    confidence="high",
                )

    # Unicode symbol definitions (e.g. "⊙ = pulse/active state")
    for regex in (_SYMBOL_DEF_RE, _SYMBOL_PAREN_RE):
        for match in regex.finditer(content):
            symbol = match.group(1).strip()
            meaning = match.group(2).strip()[:200]

            if not symbol or len(symbol) > 4:
                continue

            if symbol not in found:
                category = _detect_category(content, match.start(), match.end()) or "symbol"
                parents = [p for p in _find_parent_words(meaning, known_words) if p != symbol]
                found[symbol] = ExtractedWord(
                    word=symbol,
                    meaning=meaning if meaning else None,
                    category=category,
                    parent_words=parents,
                    confidence="high",
                )

    # -- Pass 2: Catch-all for conlang presets --
    use_pass2 = preset in _CONLANG_PRESETS

    if use_pass2:
        # ASCII ALL_CAPS tokens
        for match in _ALLCAPS_RE.finditer(content):
            word = match.group(1).upper().strip("-")
            if word in _BLOCKLIST or word in found or len(word) < 3:
                continue
            if word not in known_words and len(word) < 4:
                continue
            if word in known_words:
                found[word] = ExtractedWord(word=word, confidence="low")
            else:
                category = _detect_category(content, match.start(), match.end())
                found[word] = ExtractedWord(word=word, category=category, confidence="low")

        # Unicode symbols -- track both new coins and re-uses of known symbols
        for match in _SYMBOL_RE.finditer(content):
            symbol = match.group(1).strip()
            if not symbol or symbol in found:
                continue
            if symbol in known_words:
                # Re-use of a previously defined symbol
                found[symbol] = ExtractedWord(word=symbol, confidence="low")
            else:
                # New symbol appearing without explicit definition
                category = _detect_category(content, match.start(), match.end()) or "symbol"
                found[symbol] = ExtractedWord(word=symbol, category=category, confidence="low")

    elif known_words:
        # For non-conlang presets, ONLY capture re-encounters of known words/symbols
        for match in _ALLCAPS_RE.finditer(content):
            word = match.group(1).upper()
            if word in known_words and word not in found:
                found[word] = ExtractedWord(word=word, confidence="low")

        for match in _SYMBOL_RE.finditer(content):
            symbol = match.group(1)
            if symbol in known_words and symbol not in found:
                found[symbol] = ExtractedWord(word=symbol, confidence="low")

    return list(found.values())


def _find_parent_words(text: str, known_words: set[str]) -> list[str]:
    """Scan text for references to already-known vocabulary (ASCII + symbols)."""
    parents = []
    for match in _ALLCAPS_RE.finditer(text):
        word = match.group(1).upper()
        if word in known_words:
            parents.append(word)
    for match in _SYMBOL_RE.finditer(text):
        symbol = match.group(1)
        if symbol in known_words:
            parents.append(symbol)
    return parents


def _detect_category(
    content: str, match_start: int, match_end: int,
) -> str | None:
    """Look for category markers near a word match (within ~80 chars)."""
    window_start = max(0, match_start - 80)
    window_end = min(len(content), match_end + 80)
    window = content[window_start:window_end]

    cat_match = _CATEGORY_RE.search(window)
    if cat_match:
        return cat_match.group(1).lower()
    return None

"""Preset loader — reads YAML files from server/presets/ directory.

Each .yaml file defines an experiment type (conlang, debate, story, etc.)
with its seed prompt, system prompt, and default configuration.
"""

import logging
from pathlib import Path
from typing import Any

import yaml

PRESETS_DIR = Path(__file__).resolve().parent / "presets"


logger = logging.getLogger(__name__)


def load_presets() -> dict[str, dict[str, Any]]:
    """Load all .yaml preset files. Returns dict keyed by preset id."""
    presets: dict[str, dict[str, Any]] = {}
    for path in sorted(PRESETS_DIR.glob("*.yaml")):
        try:
            with path.open(encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, dict):
                logger.warning("Skipping %s: not a valid YAML mapping", path.name)
                continue
            preset_id = data.get("id") or path.stem
            presets[preset_id] = data
        except Exception:
            logger.warning("Failed to load preset %s, skipping", path.name, exc_info=True)
    return presets

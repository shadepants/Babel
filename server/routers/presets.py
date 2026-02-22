"""Presets router — serve available experiment presets.

Presets are loaded once at startup (in app.py lifespan) and stored
on app.state.presets. This router just serves them as JSON.
"""

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(tags=["presets"])


def _get_presets(request: Request) -> dict:
    return request.app.state.presets


@router.get("/")
async def list_presets(request: Request):
    """Return all available presets as an ordered list."""
    presets = _get_presets(request)
    return {"presets": list(presets.values())}


@router.get("/{preset_id}")
async def get_preset(preset_id: str, request: Request):
    """Return a single preset by ID."""
    presets = _get_presets(request)
    if preset_id not in presets:
        raise HTTPException(404, f"Preset '{preset_id}' not found")
    return presets[preset_id]

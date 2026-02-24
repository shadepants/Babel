"""Personas CRUD router -- Phase 16."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(tags=["personas"])


def _get_db(request: Request):
    return request.app.state.db


class PersonaCreateRequest(BaseModel):
    name: str
    personality: str = ""
    backstory: str = ""
    avatar_color: str = "#F59E0B"


class PersonaUpdateRequest(BaseModel):
    name: str | None = None
    personality: str | None = None
    backstory: str | None = None
    avatar_color: str | None = None


@router.get("")
async def list_personas(request: Request):
    db = _get_db(request)
    return await db.get_all_personas()


@router.post("", status_code=201)
async def create_persona(request: Request, body: PersonaCreateRequest):
    db = _get_db(request)
    persona_id = await db.create_persona(
        name=body.name,
        personality=body.personality,
        backstory=body.backstory,
        avatar_color=body.avatar_color,
    )
    return await db.get_persona(persona_id)


@router.get("/{persona_id}")
async def get_persona(request: Request, persona_id: str):
    db = _get_db(request)
    persona = await db.get_persona(persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.put("/{persona_id}")
async def update_persona(
    request: Request, persona_id: str, body: PersonaUpdateRequest
):
    db = _get_db(request)
    if not await db.get_persona(persona_id):
        raise HTTPException(status_code=404, detail="Persona not found")
    updates = body.model_dump(exclude_none=True)
    if updates:
        await db.update_persona(persona_id, **updates)
    return await db.get_persona(persona_id)


@router.delete("/{persona_id}", status_code=204)
async def delete_persona(request: Request, persona_id: str):
    db = _get_db(request)
    if not await db.get_persona(persona_id):
        raise HTTPException(status_code=404, detail="Persona not found")
    await db.delete_persona(persona_id)

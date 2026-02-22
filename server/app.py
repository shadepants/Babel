"""Babel — FastAPI application with lifespan pattern.

Adapted from Factory's core/gateway.py. The lifespan context manager
initializes the database and event hub on startup, and cleans up on
shutdown.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.db import Database
from server.event_hub import EventHub

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect DB + create EventHub. Shutdown: close DB."""
    # ── Startup ──
    db = Database()
    await db.connect()
    app.state.db = db

    hub = EventHub()
    app.state.hub = hub

    logger.info("Babel started — database connected, event hub ready")
    yield

    # ── Shutdown ──
    await db.close()
    logger.info("Babel shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Babel",
        version="0.1.0",
        description="AI-to-AI Conversation Arena",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount routers
    from server.routers.relay import router as relay_router

    app.include_router(relay_router, prefix="/api")

    return app


app = create_app()

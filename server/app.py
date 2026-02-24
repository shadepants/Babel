"""Babel — FastAPI application with lifespan pattern.

Adapted from Factory's core/gateway.py. The lifespan context manager
initializes the database and event hub on startup, and cleans up on
shutdown.
"""

import logging
import os
from contextlib import asynccontextmanager

# Prevent litellm from making a blocking network call on import.
# It fetches model pricing from GitHub; on this machine that call hangs.
# The local bundled backup is identical for our purposes.
os.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "True")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.db import Database
from server.event_hub import EventHub
from server.presets import load_presets

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

    app.state.presets = load_presets()

    # Phase 13b: track human-in-the-loop locks per RPG match
    app.state.human_events = {}  # match_id -> asyncio.Event

    logger.info(
        "Babel started — database connected, event hub ready, %d presets loaded",
        len(app.state.presets),
    )
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
    from server.routers.experiments import router as experiments_router
    from server.routers.presets import router as presets_router
    from server.routers.tournaments import router as tournaments_router

    app.include_router(relay_router, prefix="/api")
    app.include_router(experiments_router, prefix="/api/experiments")
    app.include_router(presets_router, prefix="/api/presets")
    app.include_router(tournaments_router, prefix="/api/tournaments")

    # --- PASSWORD PROTECTION GATEKEEPER (share mode only) ---
    if os.getenv("SHARE_MODE"):
        from fastapi.responses import HTMLResponse, RedirectResponse
        from fastapi import Request

        # Change this to whatever you want!
        SHARED_PASSWORD = os.getenv("SHARE_PASSWORD", "babel123")

        @app.middleware("http")
        async def password_gate(request: Request, call_next):
            # 1. Allow access to the login process and favicon
            if request.url.path in ["/login", "/favicon.ico"]:
                return await call_next(request)

            # 2. Check for the access cookie
            access_token = request.cookies.get("babel_access")
            if access_token != SHARED_PASSWORD:
                # If it's an API call, return Unauthorized
                if request.url.path.startswith("/api"):
                    return HTMLResponse("Unauthorized", status_code=401)
                # If it's a browser page load, show the login screen
                return HTMLResponse(content=f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Babel — Restricted Access</title>
                        <style>
                            body {{ font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; margin: 0; }}
                            form {{ background: #1e293b; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 300px; text-align: center; }}
                            input {{ width: 100%; padding: 0.75rem; margin: 1rem 0; border: 1px solid #334155; border-radius: 4px; background: #0f172a; color: white; box-sizing: border-box; }}
                            button {{ width: 100%; padding: 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }}
                            button:hover {{ background: #2563eb; }}
                            h2 {{ margin-top: 0; color: #94a3b8; font-size: 1.2rem; }}
                        </style>
                    </head>
                    <body>
                        <form method="POST" action="/login">
                            <h2>Babel Access Required</h2>
                            <input type="password" name="password" placeholder="Enter password" required autofocus>
                            <button type="submit">Unlock Arena</button>
                        </form>
                    </body>
                    </html>
                """)

            return await call_next(request)

        @app.post("/login")
        async def login_handler(request: Request):
            form_data = await request.form()
            password = form_data.get("password")
            if password == SHARED_PASSWORD:
                response = RedirectResponse(url="/", status_code=303)
                # Set a simple cookie that expires in 24 hours
                response.set_cookie(key="babel_access", value=SHARED_PASSWORD, max_age=86400, httponly=True)
                return response
            return RedirectResponse(url="/", status_code=303)

    # Mount UI static files
    from fastapi.staticfiles import StaticFiles
    ui_dist_path = os.path.join(os.path.dirname(__file__), "..", "ui", "dist")
    if os.path.exists(ui_dist_path):
        app.mount("/", StaticFiles(directory=ui_dist_path, html=True), name="ui")

    # SPA catch-all route for client-side routes (never intercept API paths)
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    @app.get("/{full_path:path}")
    async def serve_ui_catchall(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        if os.path.exists(os.path.join(ui_dist_path, "index.html")):
            return FileResponse(os.path.join(ui_dist_path, "index.html"))
        return HTMLResponse("UI build not found. Run 'npm run build' in the ui directory.", status_code=404)

    return app


app = create_app()

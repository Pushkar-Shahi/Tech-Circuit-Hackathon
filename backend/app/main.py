"""VeriBrand AI — AI-Powered Brand Governance & Multimodal Compliance Platform.

FastAPI REST API serving all five pillars:
1. Ingest (Brand Brain & Registries)
2. Analyze (Multimodal Auditing)
3. Suggest (Explainable AI Copilot)
4. Manage (Approval Workflow & Brand Readiness Score)
5. Track (Governance Analytics & Rule Friction Detector)
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import select

from app.api.routers import analytics, audit, brain, brands, campaigns, queue
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.db.init import init_db
from app.db.models import BrandRow
from app.db.session import session_scope

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("veribrand")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(use_alembic=False)
    # Check if demo data needs to be seeded
    with session_scope() as db:
        brand_count = len(db.execute(select(BrandRow)).scalars().all())
        if brand_count == 0:
            log.info("No existing brands found — auto-seeding demo data...")
            from scripts.seed_demo import seed_demo_data

            seed_demo_data()

    settings = get_settings()
    log.info(
        "VeriBrand AI Engine Ready (auth=%s, ai=%s, db=%s)",
        settings.auth_mode,
        f"Gemini ({settings.ai_model})" if settings.has_gemini_key else "offline deterministic rubric fallback",
        settings.database_url,
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="VeriBrand AI API",
        version="1.0.0",
        description="AI-Powered Enterprise Brand Governance & Multimodal Compliance Auditing Platform",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    install_error_handlers(app)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", "X-Demo-Role", "Authorization"],
    )

    # Register Routers
    for r in (
        brands.router,
        brain.router,
        campaigns.router,
        queue.router,
        analytics.router,
        audit.router,
    ):
        app.include_router(r, prefix="/api")

    @app.get("/api/health", tags=["system"])
    def health_check():
        return {
            "status": "healthy",
            "service": "VeriBrand AI",
            "version": "1.0.0",
            "aiConfigured": settings.has_gemini_key,
        }

    return app


app = create_app()

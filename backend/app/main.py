from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.database import engine

from app.api.routes import auth
from app.api.routes.policies import router as policies_router
from app.api.routes.providers import router as providers_router
from app.api.routes.employees import router as employees_router
from app.api.routes.service_management import router as service_management_router
from app.api.routes.requests import router as requests_router
from app.api.routes.quotations import router as quotations_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.request_extensions import (
    router as request_extensions_router,
)
from app.api.routes.admin_providers import (
    router as admin_providers_router,
)
from app.api.routes.invoices import router as invoices_router
from app.api.routes.payments import router as payments_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.disputes import router as disputes_router
from app.api.routes.service_areas import router as service_areas_router
from app.api.routes.ai import router as ai_router

app = FastAPI(
    title="ServiceFlow API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    # Origins come from the CORS_ORIGINS env var (comma-separated) so the
    # deployed frontend's origin can be set without a code change.
    allow_origins=[
        origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register each router exactly once.
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(policies_router)
app.include_router(providers_router)
app.include_router(service_areas_router, prefix="/providers")
app.include_router(employees_router)
app.include_router(service_management_router)
app.include_router(requests_router)
app.include_router(quotations_router)
app.include_router(jobs_router)
app.include_router(request_extensions_router)
app.include_router(invoices_router)
app.include_router(payments_router)
app.include_router(admin_providers_router)
app.include_router(notifications_router)
app.include_router(disputes_router)
app.include_router(ai_router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/health/db", tags=["Health"])
def database_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(
                text("SELECT 1")
            ).scalar_one()

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from None

    return {
        "status": "ok",
        "database": "connected",
    }

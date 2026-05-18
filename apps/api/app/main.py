import logging

from fastapi import FastAPI

from app.config import settings
from app.logging_config import configure_logging
from app.observability import init_sentry
from app.routers.area import router as area_router
from app.routers.crime import router as crime_router
from app.routers.flood import router as flood_router
from app.routers.health import router as health_router
from app.routers.planning import router as planning_router
from app.routers.report import router as report_router

configure_logging()
init_sentry()

logger = logging.getLogger(__name__)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

logger.info("Starting %s %s (%s)", settings.app_name, settings.app_version, settings.app_env)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "status": "running",
    }


app.include_router(health_router)
app.include_router(area_router)
app.include_router(crime_router)
app.include_router(flood_router)
app.include_router(planning_router)
app.include_router(report_router)


if settings.app_env == "development":

    @app.get("/debug-sentry")
    async def debug_sentry() -> None:
        raise RuntimeError("Sentry test error")

import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.planning import PlanningSummary
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.planning_service import PlanningService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = PlanningService()


@router.get(
    "/planning/{postcode}",
    response_model=PlanningSummary,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_planning(
    postcode: str,
    radius_km: float = Query(default=2.0, ge=0.5, le=10.0),
) -> PlanningSummary | JSONResponse:
    try:
        return await _service.get_planning_summary(postcode, radius_km)
    except PostcodeNotFoundError:
        body = ErrorResponse(
            error=ErrorDetail(
                code="invalid_postcode",
                message="The postcode was not found or is invalid.",
                retryable=False,
            )
        )
        return JSONResponse(status_code=404, content=body.model_dump())
    except ProviderUnavailableError:
        body = ErrorResponse(
            error=ErrorDetail(
                code="provider_unavailable",
                message="The planning data service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

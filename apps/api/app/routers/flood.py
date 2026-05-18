import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.flood import FloodRiskSummary
from app.providers.environment_agency import (
    EnvironmentAgencyProviderError,
    EnvironmentAgencyProviderTimeoutError,
)
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.flood_service import FloodService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = FloodService()


@router.get(
    "/flood/{postcode}",
    response_model=FloodRiskSummary,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_flood(postcode: str) -> FloodRiskSummary | JSONResponse:
    try:
        return await _service.get_flood_summary(postcode)
    except PostcodeNotFoundError:
        body = ErrorResponse(
            error=ErrorDetail(
                code="invalid_postcode",
                message="The postcode was not found or is invalid.",
                retryable=False,
            )
        )
        return JSONResponse(status_code=404, content=body.model_dump())
    except (
        EnvironmentAgencyProviderTimeoutError,
        EnvironmentAgencyProviderError,
        ProviderUnavailableError,
    ):
        body = ErrorResponse(
            error=ErrorDetail(
                code="provider_unavailable",
                message="The flood data service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.air_quality import AirQualitySummary
from app.providers.sensor_community import (
    SensorCommunityProviderError,
    SensorCommunityProviderTimeoutError,
)
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.air_quality_service import AirQualityService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = AirQualityService()


@router.get(
    "/air-quality/{postcode}",
    response_model=AirQualitySummary,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_air_quality(postcode: str) -> AirQualitySummary | JSONResponse:
    try:
        return await _service.get_air_quality(postcode)
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
        SensorCommunityProviderTimeoutError,
        SensorCommunityProviderError,
        ProviderUnavailableError,
    ):
        body = ErrorResponse(
            error=ErrorDetail(
                code="provider_unavailable",
                message="The air quality service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

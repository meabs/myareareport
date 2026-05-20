import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.house_prices import HousePricesSummary
from app.providers.land_registry import (
    LandRegistryProviderError,
    LandRegistryProviderTimeoutError,
)
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.house_prices_service import HousePricesService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = HousePricesService()


@router.get(
    "/house-prices/{postcode}",
    response_model=HousePricesSummary,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_house_prices(postcode: str) -> HousePricesSummary | JSONResponse:
    try:
        return await _service.get_house_prices(postcode)
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
        LandRegistryProviderTimeoutError,
        LandRegistryProviderError,
        ProviderUnavailableError,
    ):
        body = ErrorResponse(
            error=ErrorDetail(
                code="provider_unavailable",
                message="The house prices service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

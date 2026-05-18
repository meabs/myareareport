import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.crime import CrimeSummary
from app.providers.police_uk import PoliceUkProviderError, PoliceUkProviderTimeoutError
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.crime_service import CrimeService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = CrimeService()


@router.get(
    "/crime/{postcode}",
    response_model=CrimeSummary,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_crime(
    postcode: str,
    months: int = Query(default=12, ge=1, le=36),
) -> CrimeSummary | JSONResponse:
    try:
        return await _service.get_crime_summary(postcode, months)
    except PostcodeNotFoundError:
        body = ErrorResponse(
            error=ErrorDetail(
                code="invalid_postcode",
                message="The postcode was not found or is invalid.",
                retryable=False,
            )
        )
        return JSONResponse(status_code=404, content=body.model_dump())
    except (PoliceUkProviderTimeoutError, PoliceUkProviderError, ProviderUnavailableError):
        body = ErrorResponse(
            error=ErrorDetail(
                code="provider_unavailable",
                message="The crime data service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

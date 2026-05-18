import logging

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.stop_search import StopSearchSummary
from app.providers.police_uk import PoliceUkProviderError, PoliceUkProviderTimeoutError
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.stop_search_service import StopSearchService

logger = logging.getLogger(__name__)
router = APIRouter()
_service = StopSearchService()


@router.get(
    "/stop-search/{postcode}",
    response_model=StopSearchSummary,
    responses={404: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
)
async def get_stop_search(
    postcode: str,
    months: int = Query(default=3, ge=1, le=12),
) -> StopSearchSummary | JSONResponse:
    try:
        return await _service.get_stop_search_summary(postcode, months)
    except PostcodeNotFoundError:
        detail = ErrorDetail(
            code="invalid_postcode", message="The postcode was not found.", retryable=False
        )
        return JSONResponse(status_code=404, content=ErrorResponse(error=detail).model_dump())
    except (PoliceUkProviderTimeoutError, PoliceUkProviderError, ProviderUnavailableError):
        detail = ErrorDetail(
            code="provider_unavailable",
            message="Stop and search data is temporarily unavailable.",
            retryable=True,
        )
        return JSONResponse(status_code=503, content=ErrorResponse(error=detail).model_dump())

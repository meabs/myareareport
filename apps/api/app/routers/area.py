from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.area import Area
from app.providers.postcodes_io import PostcodeNotFoundError, ProviderUnavailableError
from app.services.area_service import AreaService

router = APIRouter()

_service = AreaService()


@router.get(
    "/area/{postcode}",
    response_model=Area,
    responses={
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def get_area(postcode: str) -> Area | JSONResponse:
    try:
        return await _service.get_area(postcode)
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
                message="The postcode lookup service is temporarily unavailable. Please try again.",
                retryable=True,
            )
        )
        return JSONResponse(status_code=503, content=body.model_dump())

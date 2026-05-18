import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.errors import ErrorDetail, ErrorResponse
from app.models.report import Report
from app.providers.postcodes_io import PostcodeNotFoundError
from app.services.report_service import ReportService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = ReportService()


@router.get(
    "/report/{postcode}",
    response_model=Report,
    responses={
        404: {"model": ErrorResponse},
    },
)
async def get_report(postcode: str) -> Report | JSONResponse:
    try:
        return await _service.get_report(postcode)
    except PostcodeNotFoundError:
        body = ErrorResponse(
            error=ErrorDetail(
                code="invalid_postcode",
                message="The postcode was not found or is invalid.",
                retryable=False,
            )
        )
        return JSONResponse(status_code=404, content=body.model_dump())

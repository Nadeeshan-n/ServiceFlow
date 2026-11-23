from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database import get_db
from app.models import User
from app.schemas.service_request import RequestListResponse
from app.services import request_service as service


router = APIRouter(
    prefix="/admin/requests",
    tags=["Admin - Requests & Jobs"],
)


admin_required = require_roles("SYSTEM_ADMIN")


@router.get(
    "",
    response_model=RequestListResponse,
)
def admin_list_requests(
    request_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    try:
        return service.list_requests_admin(
            db,
            status=request_status,
            limit=limit,
            offset=offset,
        )
    except service.RequestServiceError as error:
        raise HTTPException(
            status_code=error.status_code, detail=error.detail
        ) from error

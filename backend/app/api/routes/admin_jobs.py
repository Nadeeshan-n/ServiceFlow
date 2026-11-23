from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database import get_db
from app.models import User
from app.schemas.job import JobListResponse
from app.services import job_service as service


router = APIRouter(
    prefix="/admin/jobs",
    tags=["Admin - Requests & Jobs"],
)


admin_required = require_roles("SYSTEM_ADMIN")


@router.get(
    "",
    response_model=JobListResponse,
)
def admin_list_jobs(
    status_filter: str | None = Query(default=None, alias="status"),
    schedule_status: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(admin_required),
    db: Session = Depends(get_db),
):
    try:
        return service.list_jobs_admin(
            db,
            status=status_filter,
            schedule_status=schedule_status,
            limit=limit,
            offset=offset,
        )
    except service.JobServiceError as error:
        raise HTTPException(
            status_code=error.status_code, detail=error.detail
        ) from error

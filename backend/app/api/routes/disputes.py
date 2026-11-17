from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.permissions import require_roles
from app.database import get_db
from app.models.user import User
from app.schemas.dispute import (
    DisputeCreate,
    DisputeResponse,
    DisputeUpdate,
    RatingCreate,
    RatingResponse,
)
from app.services.dispute_service import list_disputes, open_dispute, rate_job, update_dispute


router = APIRouter()
DatabaseSession = Annotated[Session, Depends(get_db)]
SignedIn = Annotated[User, Depends(get_current_user)]
Admin = Annotated[User, Depends(require_roles("SYSTEM_ADMIN"))]
ResourceId = Annotated[int, Path(gt=0, le=2_147_483_647)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


@router.post("/jobs/{job_id}/disputes", response_model=DisputeResponse, status_code=201, tags=["Disputes"])
def create_job_dispute(job_id: ResourceId, data: DisputeCreate, user: SignedIn, db: DatabaseSession):
    return open_dispute(db, user, job_id, data)


@router.get("/disputes/mine", response_model=list[DisputeResponse], tags=["Disputes"])
def read_my_disputes(user: SignedIn, db: DatabaseSession, limit: Limit = 20, offset: Offset = 0):
    return list_disputes(db, user=user, limit=limit, offset=offset)


@router.get("/admin/disputes", response_model=list[DisputeResponse], tags=["Admin - Disputes"])
def read_admin_disputes(admin: Admin, db: DatabaseSession, limit: Limit = 20, offset: Offset = 0):
    return list_disputes(db, limit=limit, offset=offset)


@router.patch("/admin/disputes/{dispute_id}", response_model=DisputeResponse, tags=["Admin - Disputes"])
def patch_dispute(dispute_id: ResourceId, data: DisputeUpdate, admin: Admin, db: DatabaseSession):
    return update_dispute(db, dispute_id, data)


@router.post("/jobs/{job_id}/rating", response_model=RatingResponse, status_code=201, tags=["Jobs"])
def create_job_rating(job_id: ResourceId, data: RatingCreate, user: SignedIn, db: DatabaseSession):
    return rate_job(db, user, job_id, data)

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.service_area import (
    ServiceAreaCreate,
    ServiceAreasResponse,
    ServiceAreaResponse,
)
from app.services.service_area_service import (
    create_service_area,
    delete_service_area,
    list_service_areas,
)

router = APIRouter(prefix="/me/service-areas")


def require_service_areas_provider(
    current_user: Annotated[User, Depends(get_current_user)],
) -> int:
    if current_user.role not in {"COMPANY_MANAGER", "INDIVIDUAL_PROVIDER"}:
        raise HTTPException(status_code=403, detail="Provider access required")

    if current_user.provider_id is None:
        raise HTTPException(status_code=403, detail="Your account is not linked to a provider")

    return current_user.provider_id


ProviderId = Annotated[int, Depends(require_service_areas_provider)]
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=ServiceAreasResponse)
def read_my_service_areas(provider_id: ProviderId, db: DatabaseSession):
    return ServiceAreasResponse(service_areas=list_service_areas(db, provider_id))


@router.post(
    "",
    response_model=ServiceAreaResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Service area already exists"}},
)
def add_my_service_area(
    data: ServiceAreaCreate, provider_id: ProviderId, db: DatabaseSession
):
    area = create_service_area(db, provider_id, data.area_name)
    if area is None:
        raise HTTPException(status_code=409, detail="Service area already exists")
    return area


@router.delete(
    "/{area_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses={404: {"description": "Service area not found"}},
)
def remove_my_service_area(
    area_id: Annotated[int, Path(gt=0, le=2_147_483_647)],
    provider_id: ProviderId,
    db: DatabaseSession,
):
    if not delete_service_area(db, provider_id, area_id):
        raise HTTPException(status_code=404, detail="Service area not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

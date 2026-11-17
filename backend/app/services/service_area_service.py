from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.provider import Provider
from app.models.provider_area import ProviderArea
from app.schemas.service_area import ServiceAreaResponse


def list_service_areas(db: Session, provider_id: int) -> list[ServiceAreaResponse]:
    areas = db.scalars(
        select(ProviderArea)
        .where(ProviderArea.provider_id == provider_id)
        .order_by(func.lower(ProviderArea.area_name), ProviderArea.id)
    )
    return [ServiceAreaResponse.model_validate(area) for area in areas]


def create_service_area(
    db: Session, provider_id: int, area_name: str
) -> ServiceAreaResponse | None:
    # Lock the provider row so simultaneous creates are serialized even
    # when the provider has no service areas yet.
    db.execute(
        select(Provider.id).where(Provider.id == provider_id).with_for_update()
    ).scalar_one()

    duplicate_id = db.scalar(
        select(ProviderArea.id)
        .where(
            ProviderArea.provider_id == provider_id,
            func.lower(func.trim(ProviderArea.area_name)) == func.lower(area_name),
        )
        .limit(1)
    )
    if duplicate_id is not None:
        db.rollback()
        return None

    area = db.scalars(
        insert(ProviderArea)
        .values(provider_id=provider_id, area_name=area_name)
        .on_conflict_do_nothing(constraint="uq_provider_areas_provider_area")
        .returning(ProviderArea)
    ).one_or_none()
    result = ServiceAreaResponse.model_validate(area) if area is not None else None
    db.commit()
    return result


def delete_service_area(db: Session, provider_id: int, area_id: int) -> bool:
    deleted_id = db.scalar(
        delete(ProviderArea)
        .where(ProviderArea.provider_id == provider_id, ProviderArea.id == area_id)
        .returning(ProviderArea.id)
    )
    db.commit()
    return deleted_id is not None

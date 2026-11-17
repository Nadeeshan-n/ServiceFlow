from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.models.provider_area import ProviderArea


area_name_max_length = getattr(ProviderArea.__table__.c.area_name.type, "length", None)
AreaName = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        min_length=1,
        max_length=area_name_max_length,
    ),
]


class ServiceAreaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    area_name: AreaName

    @field_validator("area_name")
    @classmethod
    def reject_null_character(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("Area name cannot contain a null character")
        return value


class ServiceAreaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider_id: int
    area_name: str


class ServiceAreasResponse(BaseModel):
    service_areas: list[ServiceAreaResponse]

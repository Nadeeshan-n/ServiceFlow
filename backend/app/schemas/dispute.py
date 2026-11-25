from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


DisputeStatus = Literal["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"]
NonBlankText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DisputeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: Annotated[NonBlankText, Field(max_length=150)]
    description: NonBlankText


class DisputeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: DisputeStatus
    admin_note: NonBlankText | None = None


class DisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    opened_by: int
    opened_by_name: str | None = None
    opened_by_email: str | None = None
    reason: str
    description: str
    status: DisputeStatus
    admin_note: str | None
    created_at: datetime
    closed_at: datetime | None


class RatingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rating: int = Field(strict=True, ge=1, le=5)
    review_text: NonBlankText | None = None


class RatingResponse(BaseModel):
    job_id: int
    rating: int
    review_text: str | None
    reviewed_at: datetime

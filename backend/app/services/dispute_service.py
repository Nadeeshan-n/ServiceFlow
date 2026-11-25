from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dispute import Dispute
from app.models.job import Job
from app.models.service_request import ServiceRequest
from app.models.user import User
from app.schemas.dispute import (
    DisputeCreate,
    DisputeResponse,
    DisputeUpdate,
    RatingCreate,
    RatingResponse,
)


ACTIVE_DISPUTE_STATUSES = ("OPEN", "UNDER_REVIEW")
FINAL_DISPUTE_STATUSES = ("RESOLVED", "CLOSED")
DISPUTE_TRANSITIONS = {
    "OPEN": ("UNDER_REVIEW",),
    "UNDER_REVIEW": FINAL_DISPUTE_STATUSES,
}


def _job_scope(user: User):
    if user.role == "CLIENT":
        owned_requests = select(ServiceRequest.id).where(ServiceRequest.client_id == user.id)
        return Job.request_id.in_(owned_requests)
    if user.role in {"COMPANY_MANAGER", "INDIVIDUAL_PROVIDER"} and user.provider_id is not None:
        return Job.provider_id == user.provider_id
    raise HTTPException(403, "Your role cannot manage job disputes")


def _completed_job(db: Session, user: User, job_id: int) -> Job:
    job = db.scalar(select(Job).where(Job.id == job_id, _job_scope(user)).with_for_update())
    if job is None:
        raise HTTPException(404, "Job not found")
    if job.status != "COMPLETED":
        raise HTTPException(409, "Job must be completed")
    return job


def open_dispute(db: Session, user: User, job_id: int, data: DisputeCreate) -> Dispute:
    _completed_job(db, user, job_id)
    existing = db.scalar(
        select(Dispute.id).where(
            Dispute.job_id == job_id, Dispute.status.in_(ACTIVE_DISPUTE_STATUSES)
        ).limit(1)
    )
    if existing is not None:
        raise HTTPException(409, "Job already has an active dispute")

    dispute = Dispute(job_id=job_id, opened_by=user.id, **data.model_dump())
    db.add(dispute)
    db.commit()
    db.refresh(dispute)
    return dispute


def _response(dispute: Dispute, opener: User | None) -> DisputeResponse:
    result = DisputeResponse.model_validate(dispute)
    if opener is not None:
        result.opened_by_name = opener.name
        result.opened_by_email = opener.email
    return result


def list_disputes(
    db: Session, *, limit: int, offset: int, user: User | None = None
) -> list[DisputeResponse]:
    query = select(Dispute, User).join(User, User.id == Dispute.opened_by)
    if user is not None:
        query = query.join(Job, Job.id == Dispute.job_id).where(_job_scope(user))
    rows = db.execute(query.order_by(Dispute.id.desc()).offset(offset).limit(limit))
    return [_response(dispute, opener) for dispute, opener in rows]


def update_dispute(db: Session, dispute_id: int, data: DisputeUpdate) -> DisputeResponse:
    dispute = db.scalar(select(Dispute).where(Dispute.id == dispute_id).with_for_update())
    if dispute is None:
        raise HTTPException(404, "Dispute not found")
    if data.status not in DISPUTE_TRANSITIONS.get(dispute.status, ()):
        raise HTTPException(409, "Invalid dispute status transition")

    dispute.status = data.status
    if "admin_note" in data.model_fields_set:
        dispute.admin_note = data.admin_note
    if data.status in FINAL_DISPUTE_STATUSES:
        dispute.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dispute)
    opener = db.scalar(select(User).where(User.id == dispute.opened_by))
    return _response(dispute, opener)


def rate_job(db: Session, user: User, job_id: int, data: RatingCreate) -> RatingResponse:
    if user.role != "CLIENT":
        raise HTTPException(403, "Only the job's client can submit a rating")
    job = _completed_job(db, user, job_id)
    if job.rating is not None:
        raise HTTPException(409, "Job already has a rating")

    reviewed_at = datetime.now(timezone.utc)
    job.rating = data.rating
    job.review_text = data.review_text
    job.reviewed_at = reviewed_at
    db.commit()
    return RatingResponse(
        job_id=job_id,
        rating=data.rating,
        review_text=data.review_text,
        reviewed_at=reviewed_at,
    )

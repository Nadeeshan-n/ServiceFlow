"""Notification event types and helpers for business services."""

import logging
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.notification_service import create_notification


logger = logging.getLogger(__name__)

class NotificationType:
    REQUEST_CREATED = "REQUEST_CREATED"
    QUOTATION_SENT = "QUOTATION_SENT"
    QUOTATION_APPROVED = "QUOTATION_APPROVED"
    QUOTATION_DECLINED = "QUOTATION_DECLINED"
    SCHEDULE_PROPOSED = "SCHEDULE_PROPOSED"
    SCHEDULE_APPROVED = "SCHEDULE_APPROVED"
    SCHEDULE_DECLINED = "SCHEDULE_DECLINED"
    JOB_COMPLETED = "JOB_COMPLETED"
    INVOICE_ISSUED = "INVOICE_ISSUED"
    PAYMENT_RECORDED = "PAYMENT_RECORDED"
    PROVIDER_APPROVED = "PROVIDER_APPROVED"
    PROVIDER_REJECTED = "PROVIDER_REJECTED"
    PROVIDER_SUSPENDED = "PROVIDER_SUSPENDED"


@contextmanager
def best_effort_notification(db: Session, event_type: str) -> Iterator[None]:
    """Roll back a failed notification while preserving the business transaction."""
    # SQLAlchemy flushes pending changes before opening a savepoint. Keep
    # business flush errors outside the notification exception handler.
    db.flush()
    savepoint = db.begin_nested()
    try:
        with savepoint:
            yield
    except Exception:
        logger.exception("Failed to create notification for %s", event_type)


def notify_provider_owners(
    db: Session,
    *,
    provider_id: int,
    title: str,
    message: str,
    notification_type: str,
) -> int:
    """
    Notify all owner accounts belonging to a provider.

    COMPANY_MANAGER and INDIVIDUAL_PROVIDER are owner roles.
    This function does not commit.
    """

    owner_ids = db.scalars(
        select(User.id).where(
            User.provider_id == provider_id,
            User.role.in_([
                "COMPANY_MANAGER",
                "INDIVIDUAL_PROVIDER",
            ]),
        )
    ).all()

    for owner_id in owner_ids:
        create_notification(
            db,
            user_id=owner_id,
            title=title,
            message=message,
            notification_type=notification_type,
        )

    return len(owner_ids)

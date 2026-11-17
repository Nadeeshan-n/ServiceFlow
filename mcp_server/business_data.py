"""Allowlisted, provider-scoped business reads for Flow AI."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import text


SOURCES = {
    "requests": (
        "service_requests AS r",
        "r.provider_id = :provider_id",
        "r.created_at",
        "r.id, r.status, r.service_id, r.preferred_date, r.created_at",
        {"NEW", "UNDER_REVIEW", "NEED_INFORMATION", "QUOTATION_SENT", "REJECTED", "CANCELLED"},
    ),
    "quotations": (
        "quotations AS q JOIN service_requests AS r ON r.id = q.request_id",
        "r.provider_id = :provider_id",
        "q.created_at",
        "q.id, q.request_id, q.status, q.total_amount, q.valid_until, q.created_at",
        {"DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"},
    ),
    "jobs": (
        "jobs AS j JOIN service_requests AS r ON r.id = j.request_id AND r.provider_id = j.provider_id",
        "j.provider_id = :provider_id AND r.provider_id = :provider_id",
        "j.created_at",
        "j.id, j.request_id, j.status, j.schedule_date, j.completed_at, j.created_at",
        {"JOB_CREATED", "SCHEDULE_PROPOSED", "SCHEDULE_CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"},
    ),
    "unpaid_invoices": (
        "invoices AS i JOIN jobs AS j ON j.id = i.job_id "
        "JOIN service_requests AS r ON r.id = j.request_id AND r.provider_id = j.provider_id",
        "j.provider_id = :provider_id AND r.provider_id = :provider_id",
        "i.issued_at",
        "i.id, i.job_id, i.invoice_number, i.payment_status, "
        "i.total_amount, i.paid_amount, (i.total_amount - i.paid_amount) AS balance_due, i.issued_at",
        {"UNPAID", "PARTIALLY_PAID"},
    ),
}


def _dates(start_date: str | None, end_date: str | None) -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).date()
    try:
        start = date.fromisoformat(start_date) if start_date else today - timedelta(days=89)
        end = date.fromisoformat(end_date) if end_date else today
    except ValueError as exc:
        raise ValueError("Dates must use YYYY-MM-DD") from exc
    if start > end or (end - start).days > 365 or end > today:
        raise ValueError("Date range must end today or earlier and span at most 366 days")
    return (
        datetime.combine(start, time.min, tzinfo=timezone.utc),
        datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc),
    )


def _json_value(value):
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def read_rows(
    connection,
    source: str,
    provider_id: int,
    *,
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 20,
    date_basis: str = "created",
) -> dict:
    if source not in SOURCES:
        raise ValueError("Unknown data source")
    if type(limit) is not int or limit < 1:
        raise ValueError("limit must be a positive integer")
    limit = min(limit, 50)
    table, scope, date_column, columns, statuses = SOURCES[source]
    if status is not None and status not in statuses:
        raise ValueError("Unsupported status for this tool")
    if source == "jobs" and date_basis == "completed":
        date_column = "j.completed_at"
    elif date_basis != "created":
        raise ValueError("date_basis must be created or, for jobs, completed")
    start, end = _dates(start_date, end_date)
    where = f"{scope} AND {date_column} >= :start_at AND {date_column} < :end_at"
    if source == "unpaid_invoices":
        where += " AND i.payment_status IN ('UNPAID', 'PARTIALLY_PAID')"
    if status:
        status_column = {"requests": "r.status", "quotations": "q.status", "jobs": "j.status", "unpaid_invoices": "i.payment_status"}[source]
        where += f" AND {status_column} = :status"
    params = {"provider_id": provider_id, "start_at": start, "end_at": end, "status": status}
    total = connection.execute(text(f"SELECT count(*) FROM {table} WHERE {where}"), params).scalar_one()
    alias = {"requests": "r", "quotations": "q", "jobs": "j", "unpaid_invoices": "i"}[source]
    rows = connection.execute(
        text(f"SELECT {columns} FROM {table} WHERE {where} "
             f"ORDER BY {date_column} DESC, {alias}.id DESC LIMIT :limit"),
        {**params, "limit": limit},
    ).mappings()
    return {
        "total_count": total,
        "limit": limit,
        "start_date": start.date().isoformat(),
        "end_date": (end - timedelta(days=1)).date().isoformat(),
        "items": [{key: _json_value(value) for key, value in row.items()} for row in rows],
    }

"""Allow resolved disputes and enforce one active dispute per job."""

from alembic import op
from sqlalchemy import text


revision = "9a84fc6bc751"
down_revision = "c9f6a4b2e871"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_disputes_closed_at", "disputes", type_="check")
    op.drop_constraint("ck_disputes_status", "disputes", type_="check")
    op.create_check_constraint(
        "ck_disputes_status", "disputes",
        "status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')",
    )
    op.create_check_constraint(
        "ck_disputes_closed_at", "disputes",
        "(status IN ('RESOLVED', 'CLOSED') AND closed_at IS NOT NULL) OR "
        "(status NOT IN ('RESOLVED', 'CLOSED') AND closed_at IS NULL)",
    )
    op.create_index(
        "uq_disputes_active_job", "disputes", ["job_id"], unique=True,
        postgresql_where=text("status IN ('OPEN', 'UNDER_REVIEW')"),
    )


def downgrade() -> None:
    op.drop_index("uq_disputes_active_job", table_name="disputes")
    op.execute("UPDATE disputes SET status = 'CLOSED' WHERE status = 'RESOLVED'")
    op.drop_constraint("ck_disputes_closed_at", "disputes", type_="check")
    op.drop_constraint("ck_disputes_status", "disputes", type_="check")
    op.create_check_constraint(
        "ck_disputes_status", "disputes", "status IN ('OPEN', 'UNDER_REVIEW', 'CLOSED')",
    )
    op.create_check_constraint(
        "ck_disputes_closed_at", "disputes",
        "(status = 'CLOSED' AND closed_at IS NOT NULL) OR "
        "(status <> 'CLOSED' AND closed_at IS NULL)",
    )

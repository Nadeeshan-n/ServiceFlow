"""Re-embed policy chunks with pinned Gemini 768-dimensional embeddings.

Run during a maintenance window with GEMINI_API_KEY set. PostgreSQL keeps the
old column and all old vectors if this transaction fails for any reason.

Revision ID: 5c8e1a94f763
Revises: 9a84fc6bc751
"""

from alembic import op
from sqlalchemy import text

revision = "5c8e1a94f763"
down_revision = "9a84fc6bc751"  # Change if the target branch has a newer head.
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.ai.embeddings import embed_texts

    connection = op.get_bind()
    # Block writes and reads until the vector dimension and data change together.
    connection.execute(text("LOCK TABLE policy_chunks IN ACCESS EXCLUSIVE MODE"))
    rows = connection.execute(
        text("SELECT id, chunk_text FROM policy_chunks ORDER BY id")
    ).all()
    connection.execute(text("ALTER TABLE policy_chunks ADD COLUMN embedding_v2 vector(768)"))
    for offset in range(0, len(rows), 16):
        batch = rows[offset:offset + 16]
        vectors = embed_texts(
            [row.chunk_text for row in batch], task_type="RETRIEVAL_DOCUMENT"
        )
        if len(vectors) != len(batch):
            raise RuntimeError("Gemini returned an incomplete migration batch")
        for row, vector in zip(batch, vectors):
            connection.execute(
                text("UPDATE policy_chunks SET embedding_v2 = CAST(:embedding AS vector) WHERE id = :id"),
                {"id": row.id, "embedding": str(vector)},
            )
    connection.execute(text("ALTER TABLE policy_chunks ALTER COLUMN embedding_v2 SET NOT NULL"))
    connection.execute(text("ALTER TABLE policy_chunks DROP COLUMN embedding"))
    connection.execute(text("ALTER TABLE policy_chunks RENAME COLUMN embedding_v2 TO embedding"))


def downgrade() -> None:
    raise RuntimeError("Cannot recover MiniLM vectors from Gemini embeddings; restore a database backup")

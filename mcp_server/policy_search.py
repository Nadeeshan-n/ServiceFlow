"""Bounded hybrid policy retrieval for the MCP read path."""

import re
from collections import defaultdict
from typing import Callable

from sqlalchemy import text

QUESTION_WORDS = {
    "a", "an", "the", "i", "is", "are", "was", "were",
    "what", "when", "where", "who", "why", "how",
    "can", "could", "do", "does", "must", "be",
    "for", "of", "in", "on", "to", "my", "our", "long",
}

SOURCE_COLUMNS = """
    SELECT c.id AS chunk_id, c.policy_id, p.title AS document_name,
           c.section_title, c.page_number, c.chunk_text
    FROM policy_chunks AS c
    JOIN policies AS p ON p.id = c.policy_id
        AND p.provider_id = c.provider_id
    WHERE p.provider_id = :provider_id
      AND c.provider_id = :provider_id
      AND p.status = 'ACTIVE'
      AND p.visibility = 'PUBLIC'
"""

VECTOR_SQL = text(SOURCE_COLUMNS + """
    ORDER BY c.embedding <=> CAST(:embedding AS vector), c.id
    LIMIT :limit
""")
KEYWORD_SQL = text(SOURCE_COLUMNS + """
      AND c.search_vector @@ websearch_to_tsquery('english', :question)
    ORDER BY ts_rank_cd(
        c.search_vector, websearch_to_tsquery('english', :question)
    ) DESC, c.id
    LIMIT :limit
""")


def fallback_text(question: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", question.lower())
    return " ".join(word for word in words if word not in QUESTION_WORDS)


def fuse(vector_rows: list[dict], keyword_rows: list[dict], limit: int) -> list[dict]:
    scores: dict[int, float] = defaultdict(float)
    chunks: dict[int, dict] = {}
    for rows in (vector_rows, keyword_rows):
        for rank, row in enumerate(rows, start=1):
            chunk_id = row["chunk_id"]
            chunks[chunk_id] = row
            scores[chunk_id] += 1 / (60 + rank)
    ranked_ids = sorted(scores, key=lambda chunk_id: (-scores[chunk_id], chunk_id))
    return [chunks[chunk_id] for chunk_id in ranked_ids[:limit]]


def search(
    connection,
    provider_id: int,
    query: str,
    top_k: int,
    encode: Callable[[str], list[float]],
) -> list[dict]:
    question = query.strip()
    if not question or len(question) > 1000:
        raise ValueError("Query must contain 1 to 1000 characters")
    if type(top_k) is not int or top_k < 1:
        raise ValueError("top_k must be a positive integer")
    limit = min(top_k, 10)
    vector = encode(question)
    if len(vector) != 768:
        raise ValueError("Query embedding must have 768 dimensions")

    vector_rows = [dict(row) for row in connection.execute(
        VECTOR_SQL,
        {"provider_id": provider_id, "embedding": str(vector), "limit": limit},
    ).mappings()]

    def keywords(search_text: str) -> list[dict]:
        return [dict(row) for row in connection.execute(
            KEYWORD_SQL,
            {"provider_id": provider_id, "question": search_text, "limit": limit},
        ).mappings()]

    keyword_rows = keywords(question)
    if not keyword_rows:
        fallback = fallback_text(question)
        if fallback and fallback != question.lower():
            keyword_rows = keywords(fallback)

    return fuse(vector_rows, keyword_rows, limit)

"""Gemini policy embeddings. This file is also copied into the MCP image."""

import math
import os
import random
import time

from google import genai
from google.genai import errors, types

DIMENSIONS = 768
MODEL = "gemini-embedding-001"
BATCH_SIZE = 16


def _model() -> str:
    configured = os.environ.get("GEMINI_EMBEDDING_MODEL", MODEL)
    if configured != MODEL:
        raise ValueError(f"GEMINI_EMBEDDING_MODEL must be {MODEL}")
    return configured


def _unit_vector(values: list[float]) -> list[float]:
    if len(values) != DIMENSIONS or not all(math.isfinite(x) for x in values):
        raise ValueError("Gemini embedding must contain 768 finite values")
    norm = math.sqrt(sum(x * x for x in values))
    if not math.isfinite(norm) or norm <= 0:
        raise ValueError("Gemini embedding has zero or invalid norm")
    return [float(x / norm) for x in values]


def embed_texts(texts: list[str], *, task_type: str) -> list[list[float]]:
    if task_type not in {"RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"}:
        raise ValueError("Unsupported embedding task type")
    if not texts:
        return []
    if any(not isinstance(value, str) or not value.strip() for value in texts):
        raise ValueError("Embedding input must be nonblank text")
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is required")
    client = genai.Client(api_key=key)
    model = _model()
    output: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start:start + BATCH_SIZE]
        for attempt in range(5):
            try:
                result = client.models.embed_content(
                    model=model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=DIMENSIONS,
                    ),
                )
                if not result.embeddings or len(result.embeddings) != len(batch):
                    raise RuntimeError("Gemini returned an incomplete embedding batch")
                vectors = [_unit_vector(item.values) for item in result.embeddings]
                output.extend(vectors)
                break
            except errors.APIError as exc:
                code = getattr(exc, "code", getattr(exc, "status_code", None))
                if code not in {429, 500, 502, 503, 504} or attempt == 4:
                    raise
                time.sleep(min(2 ** attempt + random.random(), 12))
    return output


def embed_query(question: str) -> list[float]:
    return embed_texts([question], task_type="RETRIEVAL_QUERY")[0]

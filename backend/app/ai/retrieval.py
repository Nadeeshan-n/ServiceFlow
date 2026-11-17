from app.ai.embeddings import embed_texts, embed_query
from app.ai.ingestion import PolicyChunk

def search_chunks(
    question: str,
    chunks: list[PolicyChunk],
    top_k: int = 3,
) -> list[tuple[PolicyChunk, float]]:
    if not chunks:
        return []

    texts = [chunk.chunk_text for chunk in chunks]
    vectors = embed_texts(texts, task_type="RETRIEVAL_DOCUMENT")
    question_vector = embed_query(question)
    scores = [sum(x * y for x, y in zip(vector, question_vector)) for vector in vectors]
    best_indices = sorted(range(len(chunks)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [(chunks[i], scores[i]) for i in best_indices]

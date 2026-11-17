import math
import os
import unittest
from unittest.mock import Mock, patch

from app.ai import embeddings


class EmbeddingTests(unittest.TestCase):
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_EMBEDDING_MODEL": "gemini-embedding-001"})
    @patch("app.ai.embeddings.genai.Client")
    def test_document_batches_and_query_task_use_normalized_768_vectors(self, client_class):
        calls = []

        def answer(*, model, contents, config):
            calls.append((model, list(contents), config))
            return Mock(embeddings=[Mock(values=[3.0, 4.0] + [0.0] * 766) for _ in contents])

        client_class.return_value.models.embed_content.side_effect = answer
        vectors = embeddings.embed_texts(["policy"] * 17, task_type="RETRIEVAL_DOCUMENT")
        query = embeddings.embed_query("question")
        self.assertEqual([len(item[1]) for item in calls], [16, 1, 1])
        self.assertEqual([item[2].task_type for item in calls], ["RETRIEVAL_DOCUMENT"] * 2 + ["RETRIEVAL_QUERY"])
        self.assertTrue(all(item[2].output_dimensionality == 768 for item in calls))
        self.assertTrue(all(item[0] == "gemini-embedding-001" for item in calls))
        self.assertEqual(len(vectors), 17)
        self.assertAlmostEqual(math.sqrt(sum(v * v for v in query)), 1.0)
        self.assertAlmostEqual(query[0], 0.6)

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_EMBEDDING_MODEL": "gemini-embedding-001"})
    @patch("app.ai.embeddings.genai.Client")
    def test_incomplete_batch_is_rejected(self, client_class):
        client_class.return_value.models.embed_content.return_value = Mock(embeddings=[])
        with self.assertRaises(RuntimeError):
            embeddings.embed_texts(["policy"], task_type="RETRIEVAL_DOCUMENT")


if __name__ == "__main__":
    unittest.main()

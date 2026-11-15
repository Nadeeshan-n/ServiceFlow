import unittest

from mcp_server.policy_search import search


class Rows:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self.rows


class Connection:
    def __init__(self):
        self.calls = []

    def execute(self, statement, parameters):
        self.calls.append((str(statement), parameters))
        if "<=>" in str(statement):
            return Rows([{"chunk_id": 10, "chunk_text": "Cancellation fee is $15"}])
        return Rows([{"chunk_id": 10, "chunk_text": "Cancellation fee is $15"}])


class PolicySearchTests(unittest.TestCase):
    def test_both_queries_have_same_scope_and_return_deduplicated_source(self):
        connection = Connection()
        rows = search(connection, 7, "Cancellation fee?", 50, lambda _: [0.0] * 384)
        self.assertEqual([row["chunk_id"] for row in rows], [10])
        self.assertEqual(len(connection.calls), 2)
        for sql, params in connection.calls:
            self.assertEqual(params["provider_id"], 7)
            self.assertEqual(params["limit"], 10)
            self.assertIn("p.provider_id = :provider_id", sql)
            self.assertIn("c.provider_id = :provider_id", sql)
            self.assertIn("p.status = 'ACTIVE'", sql)
            self.assertIn("p.visibility = 'PUBLIC'", sql)

    def test_invalid_limits_and_query_do_not_reach_database(self):
        connection = Connection()
        for question, limit in (("", 5), ("q" * 1001, 5), ("hello", 0)):
            with self.assertRaises(ValueError):
                search(connection, 7, question, limit, lambda _: [0.0] * 384)
        self.assertEqual(connection.calls, [])


if __name__ == "__main__":
    unittest.main()

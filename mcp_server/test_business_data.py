import unittest

from mcp_server.business_data import read_rows


class Result:
    def __init__(self, count=False):
        self.count = count

    def scalar_one(self):
        return 72

    def mappings(self):
        return [{"id": 5, "status": "COMPLETED"}] if not self.count else []


class Connection:
    def __init__(self):
        self.calls = []

    def execute(self, sql, params):
        self.calls.append((str(sql), params))
        return Result(count=len(self.calls) == 1)


class BusinessDataTests(unittest.TestCase):
    def test_all_tools_enforce_scope_and_limit(self):
        for source in ("requests", "quotations", "jobs", "unpaid_invoices"):
            connection = Connection()
            result = read_rows(connection, source, 15, limit=100)
            self.assertEqual(result["total_count"], 72)
            self.assertEqual(result["limit"], 50)
            self.assertEqual(len(result["items"]), 1)
            for sql, params in connection.calls:
                self.assertIn("provider_id = :provider_id", sql)
                self.assertEqual(params["provider_id"], 15)
            self.assertEqual(connection.calls[1][1]["limit"], 50)
            if source == "unpaid_invoices":
                self.assertIn("i.payment_status IN ('UNPAID', 'PARTIALLY_PAID')", connection.calls[0][0])

    def test_completed_jobs_use_completion_date_and_reject_unbounded_ranges(self):
        connection = Connection()
        read_rows(connection, "jobs", 15, status="COMPLETED",
                  start_date="2026-10-01", end_date="2026-10-31", date_basis="completed")
        self.assertIn("j.completed_at >= :start_at", connection.calls[0][0])
        self.assertIn("j.status = :status", connection.calls[0][0])
        for kwargs in (
            {"start_date": "2024-01-01", "end_date": "2026-01-01"},
            {"start_date": "2026-10-31", "end_date": "2026-10-01"},
            {"status": "ANY"},
            {"limit": 0},
        ):
            with self.assertRaises(ValueError):
                read_rows(Connection(), "jobs", 15, **kwargs)


if __name__ == "__main__":
    unittest.main()

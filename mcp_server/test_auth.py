import asyncio
import os
import time
import unittest
from unittest.mock import patch

import jwt

# These values configure the server at import time; no database is contacted.
os.environ.setdefault("MCP_SIGNING_KEY", "local-test-key-32-characters-long")
os.environ.setdefault("MCP_DB_PASSWORD", "not-used")

from mcp_server.server import auth, caller_provider_id  # noqa: E402


class ScopeTests(unittest.TestCase):
    def test_signed_token_scope_and_wrong_audience(self):
        claims = {
            "iss": "serviceflow-backend",
            "aud": "serviceflow-mcp",
            "sub": "user:1",
            "exp": int(time.time()) + 60,
            "purpose": "serviceflow-mcp",
            "provider_id": 7,
        }
        good = jwt.encode(claims, os.environ["MCP_SIGNING_KEY"], algorithm="HS256")
        wrong_audience = jwt.encode(
            {**claims, "aud": "serviceflow-browser"},
            os.environ["MCP_SIGNING_KEY"],
            algorithm="HS256",
        )
        token = asyncio.run(auth.verify_token(good))
        self.assertIsNotNone(token)
        self.assertIsNone(asyncio.run(auth.verify_token(wrong_audience)))
        with patch("mcp_server.server.get_access_token", return_value=token):
            self.assertEqual(caller_provider_id(), 7)

    def test_missing_or_invalid_scope_is_rejected(self):
        with patch("mcp_server.server.get_access_token", return_value=None):
            with self.assertRaises(PermissionError):
                caller_provider_id()
        for provider_id in (None, 0, -1, "7", True):
            with patch(
                "mcp_server.server.get_access_token",
                return_value=type("Token", (), {"claims": {
                    "purpose": "serviceflow-mcp", "provider_id": provider_id
                }})(),
            ):
                with self.assertRaises(PermissionError):
                    caller_provider_id()


if __name__ == "__main__":
    unittest.main()

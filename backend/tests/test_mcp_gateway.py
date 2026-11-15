import os
import unittest
from unittest.mock import patch

import jwt

from app.ai.mcp_gateway import _internal_token


class InternalTokenTests(unittest.TestCase):
    def test_internal_token_has_distinct_audience_and_scoped_expiry(self):
        key = "a-private-internal-key-longer-than-32-characters"
        with patch.dict(os.environ, {"MCP_SIGNING_KEY": key}):
            token = _internal_token(user_id=8, provider_id=14)
        claims = jwt.decode(token, key, algorithms=["HS256"],
                            issuer="serviceflow-backend", audience="serviceflow-mcp")
        self.assertEqual(claims["provider_id"], 14)
        self.assertEqual(claims["sub"], "user:8")
        self.assertEqual(claims["purpose"], "serviceflow-mcp")
        self.assertLessEqual(claims["exp"] - claims["iat"], 60)


if __name__ == "__main__":
    unittest.main()

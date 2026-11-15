"""Service-to-service MCP calls; never accepts tenant scope from a request body."""

import os
from datetime import datetime, timedelta, timezone

import jwt
from fastmcp import Client
from fastmcp.client.auth import BearerAuth


def _internal_token(*, user_id: int, provider_id: int) -> str:
    secret = os.environ.get("MCP_SIGNING_KEY")
    if not secret or len(secret) < 32:
        raise RuntimeError("MCP_SIGNING_KEY must be configured (32+ characters)")
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "iss": "serviceflow-backend",
            "aud": "serviceflow-mcp",
            "sub": f"user:{user_id}",
            "iat": now,
            "exp": now + timedelta(seconds=60),
            "purpose": "serviceflow-mcp",
            "provider_id": provider_id,
        },
        secret,
        algorithm="HS256",
    )


async def call_scoped_tool(name: str, arguments: dict, *, user_id: int,
                           provider_id: int):
    if name not in {"search_policy_docs", "get_requests", "get_quotations",
                    "get_jobs", "get_unpaid_invoices"}:
        raise ValueError("Unsupported MCP tool")
    url = os.environ.get("MCP_URL", "http://mcp:8001/mcp")
    token = _internal_token(user_id=user_id, provider_id=provider_id)
    async with Client(url, auth=BearerAuth(token), timeout=30) as client:
        result = await client.call_tool(name, arguments)
    return result.data

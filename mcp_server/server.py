"""Internal, authenticated, read-only MCP access to ServiceFlow data."""

import os

from fastmcp import FastMCP
from fastmcp.server.auth.providers.jwt import JWTVerifier
from fastmcp.server.dependencies import get_access_token
from sqlalchemy import URL, create_engine, text


def required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"{name} must be configured")
    return value


auth = JWTVerifier(
    public_key=required("MCP_SIGNING_KEY"),
    issuer="serviceflow-backend",
    audience="serviceflow-mcp",
    algorithm="HS256",
)
mcp = FastMCP("ServiceFlow read-only tools", auth=auth)

engine = create_engine(
    URL.create(
        "postgresql+psycopg",
        username="serviceflow_ro",
        password=required("MCP_DB_PASSWORD"),
        host=os.environ.get("MCP_DB_HOST", "db"),
        port=int(os.environ.get("MCP_DB_PORT", "5432")),
        database=os.environ.get("MCP_DB_NAME", "serviceflow"),
    ),
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)


def caller_provider_id() -> int:
    token = get_access_token()
    if token is None:
        raise PermissionError("MCP bearer token required")
    claims = token.claims
    if claims.get("purpose") != "serviceflow-mcp":
        raise PermissionError("Invalid token purpose")
    provider_id = claims.get("provider_id")
    if type(provider_id) is not int or provider_id <= 0:
        raise PermissionError("Valid provider scope required")
    return provider_id


@mcp.tool
def probe_policy_access() -> dict[str, int]:
    """Count the caller's active public policies to check scoped DB access."""
    provider_id = caller_provider_id()
    with engine.connect() as connection:
        connection.execute(text("SET TRANSACTION READ ONLY"))
        count = connection.execute(
            text("""
                SELECT count(*) FROM policies
                WHERE provider_id = :provider_id
                  AND status = 'ACTIVE' AND visibility = 'PUBLIC'
            """),
            {"provider_id": provider_id},
        ).scalar_one()
    return {"active_public_policies": count}


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8001)

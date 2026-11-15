"""Internal, authenticated, read-only MCP access to ServiceFlow data."""

import os
from functools import lru_cache

from fastmcp import FastMCP
from fastmcp.server.auth.providers.jwt import JWTVerifier
from fastmcp.server.dependencies import get_access_token
from sqlalchemy import URL, create_engine, text

from mcp_server.policy_search import search
from mcp_server.business_data import read_rows


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


@lru_cache(maxsize=1)
def embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(os.environ.get(
        "MCP_EMBEDDING_MODEL_PATH", "sentence-transformers/all-MiniLM-L6-v2"
    ))


def encode_question(question: str) -> list[float]:
    return embedding_model().encode(question, normalize_embeddings=True).tolist()


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


@mcp.tool
def search_policy_docs(query: str, top_k: int = 5) -> list[dict]:
    """Find cited chunks in this provider's ACTIVE, PUBLIC policy PDFs."""
    provider_id = caller_provider_id()
    with engine.connect() as connection:
        connection.execute(text("SET TRANSACTION READ ONLY"))
        return search(connection, provider_id, query, top_k, encode_question)


def _business_tool(source: str, status: str | None, start_date: str | None,
                   end_date: str | None, limit: int, date_basis: str = "created") -> dict:
    provider_id = caller_provider_id()
    with engine.connect() as connection:
        connection.execute(text("SET TRANSACTION READ ONLY"))
        return read_rows(connection, source, provider_id, status=status,
                         start_date=start_date, end_date=end_date,
                         limit=limit, date_basis=date_basis)


@mcp.tool
def get_requests(status: str | None = None, start_date: str | None = None,
                 end_date: str | None = None, limit: int = 20) -> dict:
    """Read the provider's requests. Dates filter creation time (UTC)."""
    return _business_tool("requests", status, start_date, end_date, limit)


@mcp.tool
def get_quotations(status: str | None = None, start_date: str | None = None,
                   end_date: str | None = None, limit: int = 20) -> dict:
    """Read the provider's quotations. Dates filter creation time (UTC)."""
    return _business_tool("quotations", status, start_date, end_date, limit)


@mcp.tool
def get_jobs(status: str | None = None, start_date: str | None = None,
             end_date: str | None = None, limit: int = 20,
             date_basis: str = "created") -> dict:
    """Read jobs; use date_basis='completed' for completed-in-period questions."""
    return _business_tool("jobs", status, start_date, end_date, limit, date_basis)


@mcp.tool
def get_unpaid_invoices(status: str | None = None, start_date: str | None = None,
                        end_date: str | None = None, limit: int = 20) -> dict:
    """Read unpaid or partially paid invoices, filtered by issue date (UTC)."""
    return _business_tool("unpaid_invoices", status, start_date, end_date, limit)


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8001)

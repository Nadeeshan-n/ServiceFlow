# ServiceFlow MCP: phase 1

This service runs inside Docker Compose without a published port. It uses
`serviceflow_ro` and accepts only a short-lived backend-issued bearer token.
`probe_policy_access` counts active public policies for the verified provider;
the tool takes no provider identifier argument. Document search and business
data tools follow in phases 2 and 3.

## One-time role setup (existing database volume)

From the repository's `docker` folder, set `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `MCP_DB_PASSWORD`, and a random `MCP_SIGNING_KEY` of at
least 32 bytes in the local, untracked `.env`. Give the signing key only to
FastAPI and MCP. Use a different value from the app's JWT secret.

Run the SQL with the database owner. Example in PowerShell:

```powershell
Get-Content .\create-readonly-role.sql | docker exec -i -e MCP_DB_PASSWORD serviceflow-db psql -X -v ON_ERROR_STOP=1 -U serviceflow -d serviceflow
docker compose up --build -d mcp
```

The SQL is idempotent. Ensure `MCP_DB_PASSWORD` in the PowerShell session
matches the password in `docker/.env`; Compose reads the file but does not
export its values into PowerShell.

## Token contract

FastAPI must authenticate the user and authorize provider membership before
issuing an internal HS256 JWT with issuer `serviceflow-backend`, audience
`serviceflow-mcp`, purpose `serviceflow-mcp`, positive integer `provider_id`,
and a short `exp` (for example 60 seconds). Send that JWT as the MCP client's
Bearer token. The agent sees only tool names and ordinary search/filter
arguments. The server verifies signature, issuer, audience, expiry and
purpose, and gets the provider from the verified token claims.

Direct Inspector calls require a valid internal token. Never pass a browser
JWT or choose a provider ID from an AI prompt. The probe runs an explicit
read-only transaction; the database role also has no write grants.

-- Supply MCP_DB_PASSWORD as an environment variable to psql.
-- The database owner must execute this once for existing Docker volumes.
\getenv mcp_password MCP_DB_PASSWORD
-- Fail before changing roles when the variable is missing.
SELECT length(:'mcp_password') > 0 AS password_configured \gset
\if :password_configured
\else
\echo 'MCP_DB_PASSWORD must be nonempty.'
\quit
\endif

SELECT 'CREATE ROLE serviceflow_ro LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'serviceflow_ro')
\gexec

ALTER ROLE serviceflow_ro LOGIN PASSWORD :'mcp_password';
GRANT CONNECT ON DATABASE serviceflow TO serviceflow_ro;
GRANT USAGE ON SCHEMA public TO serviceflow_ro;
GRANT SELECT ON TABLE policies, policy_chunks,
    service_requests, quotations, jobs, invoices TO serviceflow_ro;

-- Limit earlier, broader grants if this role existed already.
REVOKE ALL ON TABLE quotation_items, payments, providers, services,
    provider_services FROM serviceflow_ro;

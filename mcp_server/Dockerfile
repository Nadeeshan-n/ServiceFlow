FROM python:3.12-slim

WORKDIR /srv
COPY mcp_server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY mcp_server/ ./mcp_server/

RUN useradd --system --uid 10001 mcpuser
USER mcpuser

CMD ["python", "-m", "mcp_server.server"]

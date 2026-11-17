FROM python:3.12-slim

WORKDIR /srv
COPY mcp_server/requirements.txt ./requirements.txt
RUN python -m pip install --timeout 180 --retries 10 -r requirements.txt
COPY mcp_server/ ./mcp_server/
COPY backend/app/ai/embeddings.py ./embeddings.py

RUN useradd --system --uid 10001 mcpuser
USER mcpuser

CMD ["python", "-m", "mcp_server.server"]

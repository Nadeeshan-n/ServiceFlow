FROM python:3.12-slim

WORKDIR /srv
COPY mcp_server/requirements.txt ./requirements.txt
RUN python -m pip install --timeout 180 --retries 10 torch --index-url https://download.pytorch.org/whl/cpu
RUN python -m pip install --timeout 180 --retries 10 -r requirements.txt
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2').save('/srv/embedding-model')"
COPY mcp_server/ ./mcp_server/

RUN useradd --system --uid 10001 mcpuser
ENV MCP_EMBEDDING_MODEL_PATH=/srv/embedding-model
USER mcpuser

CMD ["python", "-m", "mcp_server.server"]

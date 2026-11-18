"""Run from backend/: pytest -q tests/test_client_policies.py

SQLite integration tests for the client-facing provider policy endpoints:
listing/downloading PUBLIC, ACTIVE policies and asking Flow AI questions
about them. The MCP gateway call and the Gemini generation step are
replaced with fakes; routing, scoping and filtering run for real.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import providers as providers_module
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.policy import Policy
from app.models.provider import Provider

NOW = datetime(2026, 11, 18, tzinfo=timezone.utc)
CLIENT = SimpleNamespace(id=501, role="CLIENT", provider_id=None)


@pytest.fixture
def api(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Provider.__table__.create(engine)
    Policy.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add_all([
        Provider(id=1, name="Alpha Services", type="INDIVIDUAL",
                 email="alpha@qtest.lk", phone="+94710000001",
                 verification_status="APPROVED"),
        Provider(id=2, name="Pending Services", type="INDIVIDUAL",
                 email="pending@qtest.lk", phone="+94710000002",
                 verification_status="PENDING"),
        Provider(id=3, name="Empty Services", type="COMPANY",
                 email="empty@qtest.lk", phone="+94710000003",
                 verification_status="APPROVED"),
        Policy(id=11, provider_id=1, title="TEST-POL-002",
               policy_type="SERVICE", visibility="PUBLIC", status="ACTIVE",
               file_path="pol11.pdf", created_at=NOW, updated_at=NOW),
        Policy(id=12, provider_id=1, title="Internal cancellation draft",
               policy_type="CANCELLATION", visibility="PRIVATE",
               status="ACTIVE", file_path="pol12.pdf",
               created_at=NOW, updated_at=NOW),
        Policy(id=13, provider_id=1, title="Old warranty",
               policy_type="WARRANTY", visibility="PUBLIC", status="INACTIVE",
               file_path="pol13.pdf", created_at=NOW, updated_at=NOW),
        Policy(id=21, provider_id=2, title="Pending provider policy",
               policy_type="SERVICE", visibility="PUBLIC", status="ACTIVE",
               file_path="pol21.pdf", created_at=NOW, updated_at=NOW),
    ])
    db.commit()
    db.close()

    def override_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app = FastAPI()
    app.include_router(providers_module.router)
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: CLIENT

    monkeypatch.setattr(providers_module, "_stored_ref",
                        lambda policy: policy.file_path)

    def fake_read_pdf(ref):
        if ref == "missing.pdf":
            raise FileNotFoundError(ref)
        return b"%PDF-1.4 fake-policy-bytes"

    monkeypatch.setattr(providers_module, "_read_pdf", fake_read_pdf)
    return TestClient(app), app


def test_list_returns_only_active_public_policies(api):
    client, _ = api
    response = client.get("/providers/1/policies")
    assert response.status_code == 200
    body = response.json()
    assert [p["id"] for p in body] == [11]
    assert body[0]["title"] == "TEST-POL-002"
    assert body[0]["visibility"] == "PUBLIC"
    assert body[0]["status"] == "ACTIVE"


def test_list_is_public_without_login(api):
    client, app = api
    app.dependency_overrides.pop(get_current_user)
    assert client.get("/providers/1/policies").status_code == 200


def test_list_empty_for_approved_provider_without_policies(api):
    client, _ = api
    response = client.get("/providers/3/policies")
    assert response.status_code == 200
    assert response.json() == []


def test_list_404_for_unapproved_or_unknown_provider(api):
    client, _ = api
    assert client.get("/providers/2/policies").status_code == 404
    assert client.get("/providers/999/policies").status_code == 404


def test_download_returns_pdf_bytes(api):
    client, _ = api
    response = client.get("/providers/1/policies/11/download")
    assert response.status_code == 200
    assert response.content == b"%PDF-1.4 fake-policy-bytes"
    assert response.headers["content-type"] == "application/pdf"


def test_download_hides_private_inactive_foreign_and_unapproved(api):
    client, _ = api
    assert client.get("/providers/1/policies/12/download").status_code == 404
    assert client.get("/providers/1/policies/13/download").status_code == 404
    assert client.get("/providers/1/policies/21/download").status_code == 404
    assert client.get("/providers/2/policies/21/download").status_code == 404


def test_download_404_when_file_missing(api, monkeypatch):
    client, _ = api
    monkeypatch.setattr(providers_module, "_read_pdf",
                        lambda ref: (_ for _ in ()).throw(FileNotFoundError(ref)))
    assert client.get("/providers/1/policies/11/download").status_code == 404


@pytest.fixture
def ask_api(api, monkeypatch):
    client, app = api
    calls = {}

    async def fake_call(name, args, user, provider_id):
        calls.update(name=name, args=args, user_id=user.id,
                     provider_id=provider_id)
        return [{
            "chunk_id": 77, "policy_id": 11, "section_title": None,
            "page_number": 2,
            "chunk_text": "Standard appointments are offered in two-hour "
                          "arrival windows.",
            "document_name": "TEST-POL-002",
        }]

    def fake_answer(question, chunks):
        return {
            "status": "answered",
            "answer": "Standard appointments are offered in two-hour "
                      "arrival windows.",
            "citations": [{"chunk_id": 77, "policy_id": 11,
                           "section_title": None, "page_number": 2}],
        }

    monkeypatch.setattr(providers_module, "_call_scoped_tool", fake_call)
    monkeypatch.setattr(providers_module, "answer_policy_question", fake_answer)
    return client, app, calls


def test_ask_policy_answers_with_url_provider_scope(ask_api):
    client, _, calls = ask_api
    response = client.post(
        "/providers/1/ask-policy",
        json={"question": "What arrival window do standard appointments use?"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "answered"
    assert body["citations"][0]["document_name"] == "TEST-POL-002"
    assert body["citations"][0]["page_number"] == 2
    # Scope came from the URL, identity from the signed-in client.
    assert calls["name"] == "search_policy_docs"
    assert calls["provider_id"] == 1
    assert calls["user_id"] == 501


def test_ask_policy_404_for_unapproved_provider(ask_api):
    client, _, calls = ask_api
    response = client.post("/providers/2/ask-policy",
                           json={"question": "What are your terms?"})
    assert response.status_code == 404
    assert calls == {}  # the AI pipeline is never reached


def test_ask_policy_requires_login(ask_api):
    client, app, _ = ask_api
    app.dependency_overrides.pop(get_current_user)
    response = client.post("/providers/1/ask-policy",
                           json={"question": "What are your terms?"})
    assert response.status_code == 401


def test_ask_policy_rejects_blank_question(ask_api):
    client, _, _ = ask_api
    response = client.post("/providers/1/ask-policy",
                           json={"question": "   "})
    assert response.status_code == 422

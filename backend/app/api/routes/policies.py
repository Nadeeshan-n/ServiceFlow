import logging
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi import Path as PathParameter
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.ai.indexing import index_policy
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.models.policy import Policy
from app.models.policy_chunk import PolicyChunk
from app.models.provider import Provider

router = APIRouter(prefix="/policies", tags=["policies"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "storage" / "policies"
MAX_PDF_BYTES = 10 * 1024 * 1024

PolicyType = Literal[
    "SERVICE", "WARRANTY", "CANCELLATION", "PAYMENT", "TERMS_AND_CONDITIONS"
]


PolicyId = Annotated[int, PathParameter(gt=0, le=2_147_483_647)]


class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_type: PolicyType
    title: str
    visibility: Literal["PUBLIC", "PRIVATE"]
    status: Literal["ACTIVE", "INACTIVE"]
    created_at: datetime
    updated_at: datetime


def require_policy_provider(user: User = Depends(get_current_user)) -> int:
    if user.role not in {"INDIVIDUAL_PROVIDER", "COMPANY_MANAGER"} or user.provider_id is None:
        raise HTTPException(403, "You cannot manage provider policies")
    return user.provider_id


def _owned_policy(session: Session, provider_id: int, policy_id: int) -> Policy:
    policy = session.scalar(
        select(Policy).where(Policy.id == policy_id, Policy.provider_id == provider_id)
    )
    if policy is None:
        raise HTTPException(404, "Policy not found")
    return policy


def _lock_provider(session: Session, provider_id: int) -> None:
    locked_id = session.scalar(
        select(Provider.id).where(Provider.id == provider_id).with_for_update()
    )
    if locked_id is None:
        raise HTTPException(404, "Provider not found")


def _publish_policy(session: Session, policy: Policy) -> None:
    session.execute(
        update(Policy)
        .where(
            Policy.provider_id == policy.provider_id,
            Policy.policy_type == policy.policy_type,
            Policy.status == "ACTIVE",
            Policy.id != policy.id,
        )
        .values(status="INACTIVE")
    )
    policy.status = "ACTIVE"
    session.flush()


def _stored_pdf(policy: Policy) -> Path:
    root = UPLOAD_DIR.resolve()
    path = Path(policy.file_path)
    try:
        if path.parent.resolve() == root and path.resolve().parent == root and not path.is_symlink():
            return root / path.name
    except (OSError, RuntimeError, ValueError):
        logger.warning("Could not resolve the PDF path for policy %s", policy.id, exc_info=True)
    raise HTTPException(409, "Policy file is outside the configured storage directory")


@router.post("/upload", status_code=201)
def upload_policy(
    title: str = Form(..., max_length=255),
    policy_type: PolicyType = Form(...),
    visibility: Literal["PUBLIC", "PRIVATE"] = Form("PRIVATE"),
    file: UploadFile = File(...),
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    title = title.strip()
    if not title:
        raise HTTPException(422, "Title cannot be blank")

    content = file.file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(413, "PDF must be 10 MB or smaller")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(422, "Upload a PDF file")

    path = UPLOAD_DIR / f"{uuid4().hex}.pdf"

    try:
        # Serialize publication for this provider before inserting a revision.
        _lock_provider(session, provider_id)

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

        policy = Policy(
            provider_id=provider_id,
            title=title,
            policy_type=policy_type,
            visibility=visibility,
            file_path=str(path),
            status="INACTIVE",
        )
        session.add(policy)
        session.flush()
        policy_id = policy.id

        try:
            chunk_count = index_policy(policy_id, session)
        except ValueError as exc:
            raise HTTPException(422, "The PDF could not be indexed") from exc

        _publish_policy(session, policy)

    except Exception:
        session.rollback()
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not remove failed policy upload %s", path)
        raise

    # If the connection drops during commit, its outcome may be unknown.
    # Keep the file so a committed policy never points to a deleted PDF.
    try:
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Policy commit failed for %s", path)
        raise

    return {
        "policy_id": policy_id,
        "provider_id": provider_id,
        "status": "ACTIVE",
        "chunk_count": chunk_count,
    }


@router.get("/me", response_model=list[PolicyResponse])
def list_my_policies(
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    return list(session.scalars(
        select(Policy)
        .where(Policy.provider_id == provider_id)
        .order_by(Policy.created_at.desc(), Policy.id.desc())
    ))


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: PolicyId,
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    return _owned_policy(session, provider_id, policy_id)


@router.get(
    "/{policy_id}/download",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def download_policy(
    policy_id: PolicyId,
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    policy = _owned_policy(session, provider_id, policy_id)
    try:
        pdf = _stored_pdf(policy).read_bytes()
    except FileNotFoundError:
        raise HTTPException(404, "Policy PDF not found")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="policy-{policy_id}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/{policy_id}", status_code=204, response_class=Response)
def delete_policy(
    policy_id: PolicyId,
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    _lock_provider(session, provider_id)
    policy = _owned_policy(session, provider_id, policy_id)
    path = _stored_pdf(policy)
    staged_path = path.with_name(f".{uuid4().hex}.deleting")
    try:
        path.rename(staged_path)
    except FileNotFoundError:
        staged_path = None
    except OSError:
        logger.exception("Could not stage PDF deletion for policy %s", policy_id)
        raise HTTPException(500, "Could not remove policy PDF")

    try:
        # The existing foreign key cascades this delete to policy_chunks.
        session.delete(policy)
        session.commit()
    except Exception:
        try:
            session.rollback()
        finally:
            if staged_path is not None:
                try:
                    staged_path.rename(path)
                except OSError:
                    logger.exception("Could not restore PDF for policy %s", policy_id)
        raise

    if staged_path is not None:
        try:
            staged_path.unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not purge staged PDF %s for policy %s", staged_path, policy_id)
    return Response(status_code=204)


@router.patch("/{policy_id}/activate", response_model=PolicyResponse)
def activate_policy(
    policy_id: PolicyId,
    provider_id: int = Depends(require_policy_provider),
    session: Session = Depends(get_db),
):
    _lock_provider(session, provider_id)
    policy = _owned_policy(session, provider_id, policy_id)
    if policy.status == "ACTIVE":
        return policy
    has_chunks = session.scalar(
        select(PolicyChunk.id)
        .where(PolicyChunk.policy_id == policy_id, PolicyChunk.provider_id == provider_id)
        .limit(1)
    )
    if not _stored_pdf(policy).is_file() or has_chunks is None:
        raise HTTPException(409, "Policy requires a stored PDF and indexed chunks before activation")
    try:
        _publish_policy(session, policy)
        result = PolicyResponse.model_validate(policy)
        session.commit()
    except Exception:
        session.rollback()
        raise
    return result

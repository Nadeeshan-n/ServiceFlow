import logging
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.ai.generation import answer_policy_question
from app.api.routes.ai import Question
from app.api.routes.ai import _call as _call_scoped_tool
from app.api.routes.policies import PolicyResponse, _read_pdf, _stored_ref
from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.policy import Policy
from app.models.provider import Provider
from app.models.user import User
from app.schemas.provider import (
    ProviderProfileResponse,
    ProviderProfileUpdate,
)

from app.schemas.working_hour import (
    WorkingHoursUpdate,
    WorkingHoursResponse,
)

from app.services.working_hour_service import (
    get_working_hours,
    replace_working_hours,
)

router = APIRouter(prefix="/providers", tags=["Providers"])
logger = logging.getLogger(__name__)


def require_provider_manager(current_user: User):
    if current_user.role not in {
        "COMPANY_MANAGER",
        "INDIVIDUAL_PROVIDER",
    }:
        raise HTTPException(
            status_code=403,
            detail="Provider access required",
        )

    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )


@router.get(
    "/me",
    response_model=ProviderProfileResponse,
)
def get_my_provider_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )

    provider = db.get(Provider, current_user.provider_id)

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="Provider profile not found",
        )

    return provider


@router.patch(
    "/me",
    response_model=ProviderProfileResponse,
)
def update_my_provider_profile(
    data: ProviderProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {
        "COMPANY_MANAGER",
        "INDIVIDUAL_PROVIDER",
    }:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to update this provider profile",
        )

    if current_user.provider_id is None:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a provider",
        )

    provider = db.get(Provider, current_user.provider_id)

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="Provider profile not found",
        )

    updates = data.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No profile fields were provided",
        )

    for field, value in updates.items():
        setattr(provider, field, value)

    try:
        db.commit()
        db.refresh(provider)
    except Exception:
        db.rollback()
        raise

    return provider


@router.get(
    "/me/working-hours",
    response_model=WorkingHoursResponse,
)
def read_my_working_hours(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_provider_manager(current_user)

    hours = get_working_hours(
        db,
        current_user.provider_id,
    )

    return {"working_hours": hours}

@router.put(
    "/me/working-hours",
    response_model=WorkingHoursResponse,
)
def update_my_working_hours(
    data: WorkingHoursUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_provider_manager(current_user)

    hours = replace_working_hours(
        db,
        current_user.provider_id,
        data,
    )

    return {"working_hours": hours}


# --- Client-facing provider policies ----------------------------------------
# Marketplace clients can read a provider's PUBLIC, ACTIVE policies and ask
# Flow AI questions about them. PRIVATE and INACTIVE policies are never
# exposed here, and a provider that is not APPROVED (i.e. not listed in the
# marketplace directory) behaves as if it does not exist.


def _public_provider(db: Session, provider_id: int) -> Provider:
    provider = db.get(Provider, provider_id)
    if provider is None or provider.verification_status != "APPROVED":
        raise HTTPException(
            status_code=404,
            detail="Provider not found",
        )
    return provider


def _public_policy(db: Session, provider_id: int, policy_id: int) -> Policy:
    policy = db.scalar(
        select(Policy).where(
            Policy.id == policy_id,
            Policy.provider_id == provider_id,
            Policy.status == "ACTIVE",
            Policy.visibility == "PUBLIC",
        )
    )
    if policy is None:
        raise HTTPException(
            status_code=404,
            detail="Policy not found",
        )
    return policy


@router.get(
    "/{provider_id}/policies",
    response_model=list[PolicyResponse],
)
def list_public_policies(
    provider_id: int,
    db: Session = Depends(get_db),
):
    _public_provider(db, provider_id)
    return list(
        db.scalars(
            select(Policy)
            .where(
                Policy.provider_id == provider_id,
                Policy.status == "ACTIVE",
                Policy.visibility == "PUBLIC",
            )
            .order_by(Policy.created_at.desc(), Policy.id.desc())
        )
    )


@router.get(
    "/{provider_id}/policies/{policy_id}/download",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def download_public_policy(
    provider_id: int,
    policy_id: int,
    db: Session = Depends(get_db),
):
    _public_provider(db, provider_id)
    policy = _public_policy(db, provider_id, policy_id)
    try:
        pdf = _read_pdf(_stored_ref(policy))
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Policy PDF not found",
        )
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="policy-{policy_id}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@router.post("/{provider_id}/ask-policy")
async def ask_provider_policy(
    provider_id: int,
    body: Question,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Same Flow AI pipeline as /ai/ask-docs, but the provider scope comes
    # from the URL instead of the caller's own account. The MCP policy
    # search only ever returns ACTIVE, PUBLIC chunks for that provider, so
    # private policies cannot leak through this endpoint. Any signed-in
    # user (typically a CLIENT) may ask; /ai/ask-data stays provider-only.
    _public_provider(db, provider_id)
    question = body.question.strip()
    if not question:
        raise HTTPException(
            status_code=422,
            detail="Question cannot be blank",
        )
    rows = await _call_scoped_tool(
        "search_policy_docs",
        {"query": question, "top_k": 5},
        current_user,
        provider_id,
    )
    chunks = [
        SimpleNamespace(
            id=row["chunk_id"],
            policy_id=row["policy_id"],
            section_title=row["section_title"],
            page_number=row["page_number"],
            chunk_text=row["chunk_text"],
        )
        for row in rows
    ]
    try:
        result = await run_in_threadpool(answer_policy_question, question, chunks)
    except Exception as exc:
        logger.exception("Public policy answer generation failed")
        raise HTTPException(
            status_code=502,
            detail="Answer generation is unavailable",
        ) from exc
    titles = {row["chunk_id"]: row["document_name"] for row in rows}
    for citation in result["citations"]:
        citation["document_name"] = titles[citation["chunk_id"]]
    return result

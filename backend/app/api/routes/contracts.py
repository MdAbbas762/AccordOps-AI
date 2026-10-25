import logging
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.auth import AuthContext, get_current_user
from app.core.rate_limit import require_rate_limited_editor
from app.models.contracts import ContractSummary, ContractUploadResponse
from app.services.audit import write_audit
from app.services.documents import DocumentValidationError, parse_contract_document
from app.services.supabase import get_supabase_admin


router = APIRouter(prefix="/contracts")
logger = logging.getLogger(__name__)
VALID_CONTRACT_TYPES = {"msa", "sow", "amendment", "other"}


@router.get("", response_model=list[ContractSummary])
def list_contracts(
    current_user: AuthContext = Depends(get_current_user),
) -> list[ContractSummary]:
    supabase = get_supabase_admin()
    contracts = (
        supabase.table("contracts")
        .select(
            "id, customer_id, title, contract_type, status, effective_date, "
            "expiration_date, auto_renews, renewal_notice_days, created_at"
        )
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []
    if not contracts:
        return []

    customer_ids = list({row["customer_id"] for row in contracts if row.get("customer_id")})
    contract_ids = [row["id"] for row in contracts]
    customer_map: dict[str, str] = {}
    if customer_ids:
        rows = (
            supabase.table("customers").select("id, name").in_("id", customer_ids).execute()
        ).data or []
        customer_map = {str(row["id"]): row["name"] for row in rows}

    version_rows = (
        supabase.table("contract_versions")
        .select("contract_id, file_name, mime_type, page_count, created_at")
        .eq("organization_id", current_user.organization_id)
        .eq("is_current", True)
        .in_("contract_id", contract_ids)
        .execute()
    ).data or []
    version_map = {str(row["contract_id"]): row for row in version_rows}

    return [
        ContractSummary(
            id=str(contract["id"]),
            title=contract["title"],
            customer_name=customer_map.get(str(contract["customer_id"]), "Unknown customer"),
            contract_type=contract["contract_type"],
            status=contract["status"],
            effective_date=contract.get("effective_date"),
            expiration_date=contract.get("expiration_date"),
            auto_renews=contract["auto_renews"],
            renewal_notice_days=contract.get("renewal_notice_days"),
            file_name=version_map.get(str(contract["id"]), {}).get("file_name"),
            mime_type=version_map.get(str(contract["id"]), {}).get("mime_type"),
            page_count=version_map.get(str(contract["id"]), {}).get("page_count"),
            created_at=contract["created_at"],
        )
        for contract in contracts
    ]


@router.post(
    "/upload",
    response_model=ContractUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_contract(
    customer_name: str = Form(...),
    title: str = Form(...),
    contract_type: str = Form(...),
    effective_date: date | None = Form(default=None),
    expiration_date: date | None = Form(default=None),
    auto_renews: bool = Form(default=False),
    renewal_notice_days: int | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> ContractUploadResponse:
    customer_name = customer_name.strip()
    title = title.strip()
    contract_type = contract_type.strip().lower()

    if len(customer_name) < 2:
        raise HTTPException(status_code=422, detail="Customer name is required.")
    if len(title) < 2:
        raise HTTPException(status_code=422, detail="Contract title is required.")
    if contract_type not in VALID_CONTRACT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid contract type.")
    if effective_date and expiration_date and expiration_date < effective_date:
        raise HTTPException(
            status_code=422,
            detail="Expiration date cannot be before the effective date.",
        )
    if renewal_notice_days is not None and renewal_notice_days < 0:
        raise HTTPException(status_code=422, detail="Renewal notice days cannot be negative.")

    filename = file.filename or ""
    try:
        file_bytes = file.file.read()
        parsed = parse_contract_document(filename, file_bytes)
    except DocumentValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    supabase = get_supabase_admin()
    duplicate = (
        supabase.table("contract_versions")
        .select("id, contract_id, file_name")
        .eq("organization_id", current_user.organization_id)
        .eq("file_hash", parsed.file_hash)
        .limit(1)
        .execute()
    ).data or []
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This exact document has already been uploaded as "
                f"{duplicate[0].get('file_name') or 'a contract file'}."
            ),
        )

    customer_id: str | None = None
    customer_created = False
    contract_created = False
    storage_uploaded = False
    contract_id = str(uuid4())
    version_id = str(uuid4())
    storage_path = (
        f"{current_user.organization_id}/{contract_id}/{version_id}/{parsed.safe_filename}"
    )

    try:
        customer_rows = (
            supabase.table("customers")
            .select("id")
            .eq("organization_id", current_user.organization_id)
            .eq("name", customer_name)
            .limit(1)
            .execute()
        ).data or []
        if customer_rows:
            customer_id = str(customer_rows[0]["id"])
        else:
            created = (
                supabase.table("customers")
                .insert(
                    {
                        "organization_id": current_user.organization_id,
                        "name": customer_name,
                        "status": "active",
                    }
                )
                .execute()
            ).data
            customer_id = str(created[0]["id"])
            customer_created = True

        supabase.storage.from_("contracts").upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                "cache-control": "3600",
                "upsert": "false",
                "content-type": parsed.mime_type,
            },
        )
        storage_uploaded = True

        contract_row = (
            supabase.table("contracts")
            .insert(
                {
                    "id": contract_id,
                    "organization_id": current_user.organization_id,
                    "customer_id": customer_id,
                    "title": title,
                    "contract_type": contract_type,
                    "status": "under_review",
                    "effective_date": effective_date.isoformat() if effective_date else None,
                    "expiration_date": expiration_date.isoformat() if expiration_date else None,
                    "auto_renews": auto_renews,
                    "renewal_notice_days": renewal_notice_days if auto_renews else None,
                    "created_by": current_user.user_id,
                }
            )
            .execute()
        ).data[0]
        contract_created = True

        supabase.table("contract_versions").insert(
            {
                "id": version_id,
                "organization_id": current_user.organization_id,
                "contract_id": contract_id,
                "version_label": "1.0",
                "source_type": "original",
                "file_name": filename,
                "file_path": storage_path,
                "mime_type": parsed.mime_type,
                "file_hash": parsed.file_hash,
                "extracted_text": parsed.text,
                "page_count": parsed.page_count,
                "is_current": True,
                "uploaded_by": current_user.user_id,
            }
        ).execute()
    except Exception as exc:
        logger.exception("Contract ingestion failed")
        if contract_created:
            try:
                supabase.table("contracts").delete().eq("id", contract_id).execute()
            except Exception:
                logger.exception("Contract rollback failed")
        if storage_uploaded:
            try:
                supabase.storage.from_("contracts").remove([storage_path])
            except Exception:
                logger.exception("Storage rollback failed")
        if customer_created and customer_id:
            try:
                supabase.table("customers").delete().eq("id", customer_id).execute()
            except Exception:
                logger.exception("Customer rollback failed")
        raise HTTPException(status_code=500, detail="Contract ingestion failed.") from exc

    write_audit(
        organization_id=current_user.organization_id,
        actor_user_id=current_user.user_id,
        actor_type="user",
        entity_type="contract",
        entity_id=contract_id,
        action="contract.uploaded",
        details={
            "title": title,
            "customer_name": customer_name,
            "contract_type": contract_type,
            "file_name": filename,
            "file_hash": parsed.file_hash,
            "extracted_characters": len(parsed.text),
        },
    )

    return ContractUploadResponse(
        id=contract_id,
        title=title,
        customer_name=customer_name,
        contract_type=contract_type,
        status="under_review",
        effective_date=effective_date,
        expiration_date=expiration_date,
        auto_renews=auto_renews,
        renewal_notice_days=renewal_notice_days if auto_renews else None,
        file_name=filename,
        mime_type=parsed.mime_type,
        page_count=parsed.page_count,
        created_at=contract_row["created_at"],
        extracted_characters=len(parsed.text),
    )

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import httpx

from app.core.config import settings
from app.models.workflows import EvaluationResultRequest
from app.services.ai import local_evaluate_evidence
from app.services.audit import write_audit
from app.services.supabase import get_supabase_admin


def get_obligation_context(*, organization_id: str, obligation_id: str) -> dict:
    supabase = get_supabase_admin()
    rows = (
        supabase.table("obligations")
        .select(
            "id, contract_id, title, description, obligation_type, risk_level, "
            "source_clause, rule_config, status"
        )
        .eq("id", obligation_id)
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    ).data or []
    if not rows:
        raise LookupError("Obligation not found")
    obligation = rows[0]
    if obligation["status"] != "approved":
        raise ValueError("Only approved obligations can be monitored")

    contract_rows = (
        supabase.table("contracts")
        .select("id, title")
        .eq("id", str(obligation["contract_id"]))
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    ).data or []
    contract_title = contract_rows[0]["title"] if contract_rows else "Contract"

    return {
        "organization_id": organization_id,
        "obligation_id": str(obligation["id"]),
        "contract_id": str(obligation["contract_id"]),
        "contract_title": contract_title,
        "obligation_title": obligation["title"],
        "obligation_description": obligation["description"],
        "obligation_type": obligation["obligation_type"],
        "risk_level": obligation["risk_level"],
        "source_clause": obligation.get("source_clause"),
        "rule_config": obligation.get("rule_config") or {},
    }


def evaluate_locally(
    *,
    organization_id: str,
    obligation_id: str,
    observed_value: str,
    evidence_note: str | None,
) -> dict:
    context = get_obligation_context(
        organization_id=organization_id,
        obligation_id=obligation_id,
    )
    return local_evaluate_evidence(
        obligation_title=context["obligation_title"],
        obligation_description=context["obligation_description"],
        expected=context["rule_config"],
        observed_value=observed_value,
        evidence_note=evidence_note,
    )


def record_evaluation(result: EvaluationResultRequest) -> dict:
    supabase = get_supabase_admin()
    context = get_obligation_context(
        organization_id=result.organization_id,
        obligation_id=result.obligation_id,
    )
    now = datetime.now(timezone.utc).isoformat()
    event_id = str(uuid4())
    event_dedupe = f"monitor-{uuid4()}"
    observed = {
        "value": result.observed_value,
        "evidence_note": result.evidence_note,
    }

    supabase.table("events").insert(
        {
            "id": event_id,
            "organization_id": result.organization_id,
            "source_system": result.source,
            "external_event_id": event_dedupe,
            "event_type": "obligation.evaluated",
            "occurred_at": now,
            "dedupe_key": event_dedupe,
            "payload": {
                **observed,
                "compliant": result.compliant,
                "provider": result.provider,
                "model": result.model,
                "n8n_execution_id": result.raw_evaluation.get("n8n_execution_id"),
            },
        }
    ).execute()

    if result.compliant:
        write_audit(
            organization_id=result.organization_id,
            actor_user_id=None,
            actor_type="n8n" if result.source == "n8n" else "system",
            entity_type="obligation",
            entity_id=result.obligation_id,
            action="monitoring.check_passed",
            details={
                "title": context["obligation_title"],
                "finding": result.finding,
                "confidence": result.confidence,
                "provider": result.provider,
                "model": result.model,
                "observed": result.observed_value,
            },
        )
        return {
            "status": "compliant",
            "event_id": event_id,
            "exception_id": None,
            "approval_id": None,
        }

    exception_id = str(uuid4())
    investigation_id = str(uuid4())
    approval_id = str(uuid4())
    severity = context["risk_level"]
    expected = context["rule_config"] or {
        "requirement": context["obligation_description"]
    }

    supabase.table("exceptions").insert(
        {
            "id": exception_id,
            "organization_id": result.organization_id,
            "contract_id": context["contract_id"],
            "obligation_id": result.obligation_id,
            "source_event_id": event_id,
            "exception_type": "monitoring_variance",
            "severity": severity,
            "status": "pending_approval",
            "title": f"Potential breach · {context['obligation_title']}",
            "summary": result.finding,
            "expected_value": expected,
            "observed_value": observed,
            "dedupe_key": f"monitoring-{uuid4()}",
        }
    ).execute()

    supabase.table("investigations").insert(
        {
            "id": investigation_id,
            "organization_id": result.organization_id,
            "exception_id": exception_id,
            "status": "completed",
            "finding": result.finding,
            "evidence": [observed],
            "confidence": result.confidence,
            "variance": {"expected": expected, "observed": observed},
            "recommended_action": result.recommended_action,
            "model_name": result.model,
            "prompt_version": "automation-v2",
            "completed_at": now,
        }
    ).execute()

    risk_level = "red" if severity in {"critical", "high"} else "amber"
    supabase.table("approvals").insert(
        {
            "id": approval_id,
            "organization_id": result.organization_id,
            "exception_id": exception_id,
            "investigation_id": investigation_id,
            "requested_action": result.recommended_action,
            "risk_level": risk_level,
            "status": "pending",
        }
    ).execute()

    write_audit(
        organization_id=result.organization_id,
        actor_user_id=None,
        actor_type="ai" if result.provider == "gemini" else ("n8n" if result.source == "n8n" else "system"),
        entity_type="exception",
        entity_id=exception_id,
        action="exception.investigated",
        details={
            "title": context["obligation_title"],
            "finding": result.finding,
            "recommended_action": result.recommended_action,
            "confidence": result.confidence,
            "provider": result.provider,
            "model": result.model,
            "approval_id": approval_id,
            "observed": result.observed_value,
            "n8n_execution_id": result.raw_evaluation.get("n8n_execution_id"),
        },
    )

    return {
        "status": "exception_created",
        "event_id": event_id,
        "exception_id": exception_id,
        "investigation_id": investigation_id,
        "approval_id": approval_id,
    }


def dispatch_monitoring_event(
    *,
    organization_id: str,
    obligation_id: str,
    observed_value: str,
    evidence_note: str | None,
    source: str,
) -> dict:
    # Validate before handing control to n8n so bad tenant/obligation IDs never leave the API.
    get_obligation_context(
        organization_id=organization_id,
        obligation_id=obligation_id,
    )

    if settings.automation_mode == "n8n":
        payload = {
            "organization_id": organization_id,
            "obligation_id": obligation_id,
            "observed_value": observed_value,
            "evidence_note": evidence_note,
            "source": source,
        }
        headers = {"Content-Type": "application/json"}
        if settings.n8n_webhook_secret:
            headers["X-AccordOps-Secret"] = settings.n8n_webhook_secret
        response = httpx.post(
            settings.n8n_evidence_webhook_url,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        try:
            data = response.json()
        except ValueError:
            data = {"status": "dispatched", "body": response.text[:500]}
        return {"automation": "n8n", **data}

    local = evaluate_locally(
        organization_id=organization_id,
        obligation_id=obligation_id,
        observed_value=observed_value,
        evidence_note=evidence_note,
    )
    record = EvaluationResultRequest(
        organization_id=organization_id,
        obligation_id=obligation_id,
        source="local_python",
        observed_value=observed_value,
        evidence_note=evidence_note,
        compliant=local["compliant"],
        finding=local["finding"],
        recommended_action=local["recommended_action"],
        confidence=local["confidence"],
        provider=local["provider"],
        model=local["model"],
        raw_evaluation=local.get("raw_evaluation", {}),
    )
    return {"automation": "local_python", **record_evaluation(record)}


def n8n_health() -> tuple[bool, str | None]:
    if not settings.n8n_base_url:
        return False, "n8n base URL is not configured"
    try:
        response = httpx.get(f"{settings.n8n_base_url.rstrip('/')}/healthz", timeout=3)
        return response.is_success, None if response.is_success else f"HTTP {response.status_code}"
    except Exception as exc:
        return False, str(exc)

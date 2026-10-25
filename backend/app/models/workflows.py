from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ObligationType = Literal["sla", "billing", "deliverable", "renewal", "other"]
RiskLevel = Literal["low", "medium", "high", "critical"]


class ObligationCandidate(BaseModel):
    obligation_type: ObligationType
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=3)
    responsible_party: str | None = None
    owner_team: str | None = None
    risk_level: RiskLevel = "medium"
    confidence: float = Field(default=0.75, ge=0, le=1)
    source_clause: str | None = None
    source_page: int | None = Field(default=None, ge=1)
    source_text: str | None = None
    rule_config: dict = Field(default_factory=dict)


class ExtractionBundle(BaseModel):
    summary: str
    obligations: list[ObligationCandidate]


class ExtractionResponse(BaseModel):
    contract_id: str
    contract_version_id: str
    provider: str
    model: str
    created: int
    summary: str


class ObligationItem(BaseModel):
    id: str
    contract_id: str
    contract_title: str
    obligation_type: str
    title: str
    description: str
    responsible_party: str | None = None
    owner_team: str | None = None
    status: str
    risk_level: str
    ai_confidence: float | None = None
    extraction_provider: str | None = None
    extraction_model: str | None = None
    confidence_factors: list[str] = Field(default_factory=list)
    source_clause: str | None = None
    source_page: int | None = None
    source_text: str | None = None
    rule_config: dict
    reviewed_at: datetime | None = None
    created_at: datetime


class ReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    owner_team: str | None = None


class MonitoringSimulationRequest(BaseModel):
    obligation_id: str
    observed_value: str = Field(min_length=1, max_length=500)
    evidence_note: str | None = Field(default=None, max_length=1500)


class EvidenceDispatchRequest(MonitoringSimulationRequest):
    source: str = Field(default="accordops_ui", max_length=80)


class AutomationContext(BaseModel):
    organization_id: str
    obligation_id: str
    contract_id: str
    contract_title: str
    obligation_title: str
    obligation_description: str
    obligation_type: str
    risk_level: str
    source_clause: str | None = None
    rule_config: dict = Field(default_factory=dict)


class EvaluationResultRequest(BaseModel):
    organization_id: str
    obligation_id: str
    source: str = "n8n"
    observed_value: str
    evidence_note: str | None = None
    compliant: bool
    finding: str
    recommended_action: str
    confidence: float = Field(ge=0, le=1)
    provider: str
    model: str
    raw_evaluation: dict = Field(default_factory=dict)


class LocalEvaluationRequest(BaseModel):
    organization_id: str
    obligation_id: str
    observed_value: str
    evidence_note: str | None = None


class ExceptionItem(BaseModel):
    id: str
    contract_id: str | None = None
    contract_title: str | None = None
    obligation_id: str
    obligation_title: str
    exception_type: str
    severity: str
    status: str
    title: str
    summary: str | None = None
    expected_value: dict
    observed_value: dict
    detected_at: datetime
    investigation: dict | None = None
    approval_id: str | None = None


class ApprovalItem(BaseModel):
    id: str
    exception_id: str
    exception_title: str
    requested_action: str
    risk_level: str
    status: str
    decision_note: str | None = None
    investigation_finding: str | None = None
    investigation_confidence: float | None = None
    created_at: datetime
    decided_at: datetime | None = None


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approved", "rejected", "changes_requested"]
    note: str | None = Field(default=None, max_length=2000)


class ActionCompletionRequest(BaseModel):
    organization_id: str
    status: Literal["succeeded", "failed"]
    workflow_name: str
    execution_summary: str
    response_payload: dict = Field(default_factory=dict)
    error_message: str | None = None


class DashboardResponse(BaseModel):
    active_contracts: int
    approved_obligations: int
    candidate_obligations: int
    open_exceptions: int
    pending_approvals: int
    automation_mode: str
    ai_mode: str
    recent_exceptions: list[dict]
    recent_activity: list[dict]


class AuditItem(BaseModel):
    id: int
    actor_type: str
    entity_type: str
    entity_id: str | None = None
    action: str
    title: str
    summary: str
    category: str
    status: str | None = None
    details: dict
    created_at: datetime

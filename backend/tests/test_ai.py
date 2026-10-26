from app.services.ai import (
    GeminiExtractionBundle,
    GeminiObligationCandidate,
    GeminiRuleConfig,
    _structured_confidence_for_gemini,
    calculate_extraction_confidence,
    extract_obligations,
    local_evaluate_evidence,
)


def test_local_rules_extract_operational_terms_with_variable_confidence(monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "ai_mode", "local_rules")
    text = (
        "Provider must respond to Priority 1 incidents within 30 minutes. "
        "Customer shall pay undisputed invoices within 30 days. "
        "Provider shall deliver a monthly service report promptly. "
        "The Agreement renews automatically unless either party provides notice 60 days before expiry."
    )

    bundle, provider, model = extract_obligations(text, "Northstar MSA")

    assert provider == "local_rules"
    assert model == "python-control-extractor-v2"
    assert len(bundle.obligations) >= 3
    assert {item.obligation_type for item in bundle.obligations} & {"sla", "billing", "renewal"}
    assert len({item.confidence for item in bundle.obligations}) > 1


def test_local_description_is_not_source_clause(monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "ai_mode", "local_rules")
    text = "Provider shall notify Customer of a confirmed security incident within 24 hours of confirmation."
    bundle, _, _ = extract_obligations(text, "Security Schedule")
    item = bundle.obligations[0]

    assert item.description != item.source_clause
    assert item.description.startswith("Requires Provider to")
    assert item.source_clause.startswith("Provider shall notify")
    assert "measurable threshold or deadline" in item.rule_config["confidence_factors"]


def test_local_evaluator_uses_numeric_threshold() -> None:
    result = local_evaluate_evidence(
        obligation_title="Priority 1 response",
        obligation_description="Requires Provider to acknowledge Priority 1 incidents within 30 minutes.",
        expected={"threshold": 30, "unit": "minutes", "operator": "<="},
        observed_value="78 minutes",
        evidence_note="Incident acknowledgement timestamp",
    )

    assert result["compliant"] is False
    assert result["confidence"] >= 0.9
    assert "78" in result["finding"]
    assert "30" in result["finding"]


def test_gemini_extraction_schema_has_no_open_ended_objects() -> None:
    schema_text = str(GeminiExtractionBundle.model_json_schema())
    assert "additionalProperties" not in schema_text
    assert '"confidence"' not in schema_text


def test_gemini_quality_score_is_computed_from_evidence_not_model_default() -> None:
    strong = GeminiObligationCandidate(
        obligation_type="sla",
        title="Priority 1 acknowledgement",
        description="Acknowledge Priority 1 incidents within 30 minutes.",
        responsible_party="Provider",
        risk_level="high",
        source_clause="Provider must acknowledge Priority 1 incidents within 30 minutes of notification.",
        source_page=4,
        rule_config=GeminiRuleConfig(
            metric="acknowledgment_time",
            operator="<=",
            threshold=30,
            unit="minutes",
            trigger="Priority 1 incident notification",
        ),
    )
    softer = GeminiObligationCandidate(
        obligation_type="deliverable",
        title="Service report",
        description="Provide service reporting when appropriate.",
        responsible_party="Provider",
        risk_level="low",
        source_clause="Provider shall provide service reports promptly and as appropriate.",
        rule_config=GeminiRuleConfig(control_family="reporting"),
    )

    strong_score, strong_factors = _structured_confidence_for_gemini(strong)
    softer_score, _ = _structured_confidence_for_gemini(softer)

    assert strong_score > softer_score
    assert strong_score <= 0.97
    assert softer_score >= 0.58
    assert "comparison rule is explicit" in strong_factors


def test_extraction_confidence_does_not_saturate_unrelated_controls() -> None:
    cases = [
        calculate_extraction_confidence(
            source_clause="Provider must acknowledge Priority 1 incidents within 30 minutes of notification.",
            description="Acknowledge critical incidents within 30 minutes of the initial alert.",
            responsible_party="Provider",
            source_page=None,
            obligation_type="sla",
            rule_config={"metric": "acknowledgment_time", "operator": "<=", "threshold": 30, "unit": "minutes", "trigger": "Priority 1 incident notification", "control_family": "incident_management"},
        )[0],
        calculate_extraction_confidence(
            source_clause="Provider shall restore Priority 1 service or provide an acceptable workaround within 4 hours.",
            description="Restore critical service or provide a workaround within four hours.",
            responsible_party="Provider",
            source_page=None,
            obligation_type="sla",
            rule_config={"metric": "restoration_time", "operator": "<=", "threshold": 4, "unit": "hours", "control_family": "incident_management"},
        )[0],
        calculate_extraction_confidence(
            source_clause="Customer shall pay undisputed invoices within 30 days of receipt.",
            description="Pay undisputed invoices within 30 days of receipt.",
            responsible_party="Customer",
            source_page=None,
            obligation_type="billing",
            rule_config={"due_days": 30, "unit": "days", "control_family": "billing"},
        )[0],
        calculate_extraction_confidence(
            source_clause="Provider shall provide service reports promptly and as appropriate.",
            description="Provide service reports when appropriate.",
            responsible_party="Provider",
            source_page=None,
            obligation_type="deliverable",
            rule_config={"control_family": "reporting"},
        )[0],
    ]

    assert len(set(cases)) >= 3
    assert max(cases) <= 0.97
    assert min(cases) >= 0.58

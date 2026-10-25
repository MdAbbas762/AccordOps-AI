import re
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.workflows import ExtractionBundle, ObligationCandidate


EXTRACTION_SYSTEM = """You are AccordOps AI, a contract operations analyst.
Extract ONLY operational obligations that a business could monitor or act on.
Focus on SLAs, billing/payment terms, deliverables, renewal/notice clauses, and
other concrete commitments. Do not invent terms. For each obligation:
- write a concise normalized description in plain business language;
- keep source_clause as the shortest faithful quotation/evidence from the contract;
- make description and source_clause meaningfully different;
- identify the responsible party when explicit;
- include practical rule fields when possible (metric, operator, threshold, unit,
  cadence, due_days, notice_days, trigger).
AccordOps calculates extraction quality after parsing. Titles should be short and readable."""


class GeminiRuleConfig(BaseModel):
    """Gemini-facing rule schema. Keep it closed and explicit for API compatibility."""

    metric: str | None = None
    operator: Literal["<=", ">=", "=", "<", ">"] | None = None
    threshold: float | None = None
    unit: str | None = None
    cadence: str | None = None
    due_days: int | None = None
    notice_days: int | None = None
    trigger: str | None = None
    control_family: str | None = None


class GeminiObligationCandidate(BaseModel):
    obligation_type: Literal["sla", "billing", "deliverable", "renewal", "other"]
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=3)
    responsible_party: str | None = None
    owner_team: str | None = None
    risk_level: Literal["low", "medium", "high", "critical"] = "medium"
    source_clause: str | None = None
    source_page: int | None = Field(default=None, ge=1)
    rule_config: GeminiRuleConfig = Field(default_factory=GeminiRuleConfig)


class GeminiExtractionBundle(BaseModel):
    summary: str
    obligations: list[GeminiObligationCandidate]


def calculate_extraction_confidence(
    *,
    source_clause: str | None,
    description: str,
    responsible_party: str | None,
    source_page: int | None,
    rule_config: dict,
) -> tuple[float, list[str]]:
    """Calculate extraction quality from observable clause/rule evidence, not model self-rating."""

    source = (source_clause or description or "").strip()
    lowered = source.lower()
    score = 0.52
    factors: list[str] = []

    if source_clause:
        score += 0.04
        factors.append("source evidence retained")
    if MODAL_PATTERN.search(source):
        score += 0.07
        factors.append("explicit obligation language")
    if responsible_party or PARTY_PATTERN.search(source):
        score += 0.05
        factors.append("responsible party identified")
    if NUMBER_UNIT_PATTERN.search(source):
        score += 0.08
        factors.append("measurable threshold or deadline")
    if any(term in lowered for term in ACTION_TERMS):
        score += 0.05
        factors.append("specific operational action")
    if any(term in lowered for term in TRIGGER_TERMS):
        score += 0.04
        factors.append("clear timing or trigger")
    if source_page:
        score += 0.02
        factors.append("source location identified")
    if rule_config.get("metric"):
        score += 0.025
        factors.append("monitoring metric identified")
    if rule_config.get("operator") and rule_config.get("threshold") is not None:
        score += 0.045
        factors.append("comparison rule is explicit")
    elif rule_config.get("threshold") is not None:
        score += 0.02
        factors.append("threshold identified")
    if rule_config.get("trigger"):
        score += 0.025
        factors.append("trigger identified")
    if (
        rule_config.get("cadence")
        or rule_config.get("due_days") is not None
        or rule_config.get("notice_days") is not None
    ):
        score += 0.03
        factors.append("operational timing normalized")

    normalized_description = re.sub(r"\W+", "", description.lower())
    normalized_source = re.sub(r"\W+", "", (source_clause or "").lower())
    if normalized_source and normalized_description and normalized_source != normalized_description:
        score += 0.015
        factors.append("normalized interpretation differs from evidence")

    if any(term in lowered for term in VAGUE_TERMS):
        score -= 0.08
        factors.append("contains subjective language")
    if len(source) < 35:
        score -= 0.03
    if len(source) > 500:
        score -= 0.03

    unique_factors = list(dict.fromkeys(factors))
    return round(min(0.96, max(0.58, score)), 2), unique_factors


def _structured_confidence_for_gemini(item: GeminiObligationCandidate) -> tuple[float, list[str]]:
    return calculate_extraction_confidence(
        source_clause=item.source_clause,
        description=item.description,
        responsible_party=item.responsible_party,
        source_page=item.source_page,
        rule_config=item.rule_config.model_dump(exclude_none=True),
    )


PARTY_PATTERN = re.compile(
    r"\b(Provider|Customer|Supplier|Client|Vendor|Company|Either party|Each party|Party)\b",
    re.I,
)
MODAL_PATTERN = re.compile(r"\b(shall|must|will|may not|required to|is required to)\b", re.I)
NUMBER_UNIT_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(minutes?|hours?|days?|business days?|%|percent|months?|years?)",
    re.I,
)
ACTION_TERMS = (
    "respond", "acknowledge", "restore", "deliver", "provide", "pay", "invoice",
    "notify", "maintain", "renew", "submit", "complete", "remediate", "report",
)
TRIGGER_TERMS = (
    "within", "no later than", "at least", "before", "after", "monthly", "annually",
    "business day", "upon", "when", "if", "unless", "per month", "per year",
)
VAGUE_TERMS = ("reasonable", "promptly", "as appropriate", "as needed", "best efforts")


def _page_from_text(text: str) -> int | None:
    match = re.search(r"\[Page\s+(\d+)\]", text)
    return int(match.group(1)) if match else None


def _risk_for(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("terminate", "penalty", "critical", "breach", "security incident")):
        return "high"
    if any(term in lowered for term in ("payment", "renew", "sla", "within", "availability")):
        return "medium"
    return "low"


def _type_for(text: str) -> str:
    lowered = text.lower()
    if any(term in lowered for term in ("invoice", "payment", "fee", "billing")):
        return "billing"
    if any(term in lowered for term in ("renew", "renewal", "non-renewal")):
        return "renewal"
    if any(term in lowered for term in ("monthly service report", "deliverable", "milestone")):
        return "deliverable"
    if any(
        term in lowered
        for term in (
            "uptime", "availability", "response time", "resolution", "restore",
            "sla", "incident", "acknowledge", "security notification",
        )
    ):
        return "sla"
    if any(term in lowered for term in ("deliver", "report", "provide")):
        return "deliverable"
    return "other"


def _strip_heading_prefix(sentence: str) -> str:
    cleaned = re.sub(r"\[Page\s+\d+\]\s*", "", sentence).strip()
    party_match = PARTY_PATTERN.search(cleaned)
    if party_match and party_match.start() > 0 and party_match.start() <= 80:
        prefix = cleaned[: party_match.start()].strip(" :-–—")
        # DOCX extraction can concatenate a short section heading with the clause.
        if prefix and len(prefix.split()) <= 7:
            return cleaned[party_match.start() :].strip()
    return cleaned


def _normalized_description(sentence: str) -> tuple[str, str | None]:
    source = _strip_heading_prefix(re.sub(r"\s+", " ", sentence).strip())
    party_match = PARTY_PATTERN.search(source)
    modal_match = MODAL_PATTERN.search(source)

    party = party_match.group(1) if party_match else None
    if party_match and modal_match and modal_match.start() > party_match.start():
        action = source[modal_match.end() :].strip(" ,;:-")
        if action:
            action = action[0].lower() + action[1:] if len(action) > 1 else action.lower()
            description = f"Requires {party} to {action}"
            if not description.endswith((".", "!", "?")):
                description += "."
            return description[:900], party

    normalized = source.replace(" shall ", " must ").replace(" Shall ", " Must ")
    if len(normalized) > 300:
        normalized = normalized[:297].rstrip() + "..."
    return f"Operational requirement: {normalized}", party


def _title_for(kind: str, sentence: str) -> str:
    labels = {
        "sla": "Service-level control",
        "billing": "Billing control",
        "renewal": "Renewal & notice control",
        "deliverable": "Deliverable control",
        "other": "Operational control",
    }
    source = _strip_heading_prefix(re.sub(r"\s+", " ", sentence).strip())
    modal = MODAL_PATTERN.search(source)
    phrase = source
    if modal:
        phrase = source[modal.end() :].strip(" ,;:-")
    phrase = re.sub(r"\s+", " ", phrase).strip().rstrip(".")
    if len(phrase) > 68:
        phrase = phrase[:65].rsplit(" ", 1)[0] + "…"
    return f"{labels[kind]} · {phrase}" if phrase else labels[kind]


def _confidence_for(sentence: str) -> tuple[float, list[str]]:
    lowered = sentence.lower()
    score = 0.48
    factors: list[str] = []

    if MODAL_PATTERN.search(sentence):
        score += 0.10
        factors.append("explicit obligation language")
    if PARTY_PATTERN.search(sentence):
        score += 0.08
        factors.append("responsible party identified")
    if NUMBER_UNIT_PATTERN.search(sentence):
        score += 0.12
        factors.append("measurable threshold or deadline")
    if any(term in lowered for term in ACTION_TERMS):
        score += 0.08
        factors.append("specific operational action")
    if any(term in lowered for term in TRIGGER_TERMS):
        score += 0.08
        factors.append("clear timing or trigger")
    if any(term in lowered for term in ("priority 1", "critical", "security", "availability", "invoice", "renew")):
        score += 0.04
        factors.append("recognizable control domain")
    if any(term in lowered for term in VAGUE_TERMS):
        score -= 0.10
        factors.append("contains subjective language")
    if len(sentence) < 35:
        score -= 0.05
    if len(sentence) > 500:
        score -= 0.04

    return round(min(0.96, max(0.55, score)), 2), factors


def _rule_for(sentence: str) -> dict:
    rule: dict = {"mode": "evidence_review"}
    number_match = NUMBER_UNIT_PATTERN.search(sentence)
    lowered = sentence.lower()
    if number_match:
        operator = ">=" if any(term in lowered for term in ("at least", "availability", "uptime")) else "<="
        rule.update(
            {
                "threshold": float(number_match.group(1)),
                "unit": number_match.group(2).lower(),
                "operator": operator,
            }
        )
    if "monthly" in lowered:
        rule["cadence"] = "monthly"
    if "annually" in lowered or "annual" in lowered:
        rule["cadence"] = "annual"
    if "notice" in lowered:
        rule["control_family"] = "notice"
    return rule


def _local_extract(text: str) -> ExtractionBundle:
    # Keep page markers close to clauses while still splitting normal prose.
    normalized = re.sub(r"\r\n?", "\n", text)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    raw_sentences = re.split(r"(?<=[.!?])\s+|\n{2,}", normalized)
    triggers = (
        " shall ", " must ", " within ", " payment ", " invoice ", " renew",
        " notice ", " deliver", " uptime", " availability", " response time",
        " resolution", " no later than ", " responsible for ", " acknowledge",
    )

    selected: list[str] = []
    for raw in raw_sentences:
        sentence = re.sub(r"\s+", " ", raw).strip()
        probe = f" {sentence.lower()} "
        if any(term in probe for term in triggers) and len(sentence) >= 25:
            selected.append(sentence)
        if len(selected) >= 14:
            break

    if not selected:
        selected = [re.sub(r"\s+", " ", normalized).strip()[:800] or "Contract requires operational review."]

    obligations: list[ObligationCandidate] = []
    seen: set[str] = set()
    for sentence in selected:
        source_clause = _strip_heading_prefix(sentence)
        dedupe = re.sub(r"\W+", "", source_clause.lower())[:180]
        if not dedupe or dedupe in seen:
            continue
        seen.add(dedupe)

        kind = _type_for(source_clause)
        description, party = _normalized_description(source_clause)
        confidence, factors = _confidence_for(source_clause)
        rule = _rule_for(source_clause)
        rule.update(
            {
                "extraction_mode": "local_rules",
                "confidence_factors": factors,
            }
        )

        obligations.append(
            ObligationCandidate(
                obligation_type=kind,
                title=_title_for(kind, source_clause),
                description=description,
                responsible_party=party,
                owner_team=None,
                risk_level=_risk_for(source_clause),
                confidence=confidence,
                source_clause=source_clause[:700],
                source_page=_page_from_text(sentence),
                source_text=sentence[:1200],
                rule_config=rule,
            )
        )

    return ExtractionBundle(
        summary=(
            "Local rules identified monitorable contract controls using explicit parties, "
            "obligation verbs, timing language and measurable thresholds. Configure Gemini "
            "for semantic extraction and richer interpretation."
        ),
        obligations=obligations,
    )


@lru_cache
def _gemini_client():
    from google import genai

    return genai.Client(api_key=settings.gemini_api_key)


def extract_obligations(text: str, contract_title: str) -> tuple[ExtractionBundle, str, str]:
    mode = settings.resolved_ai_mode
    if mode != "gemini":
        return _local_extract(text), "local_rules", "python-control-extractor-v2"

    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is required when AI_MODE=gemini")

    from google.genai import types

    content = text[:70000]
    response = _gemini_client().models.generate_content(
        model=settings.gemini_model,
        contents=(
            f"Contract title: {contract_title}\n\n"
            f"Contract text:\n{content}"
        ),
        config=types.GenerateContentConfig(
            system_instruction=EXTRACTION_SYSTEM,
            temperature=0.1,
            response_mime_type="application/json",
            # Do not expose AccordOps' internal dict fields directly to Gemini.
            # The GenerateContent structured-output path rejects open-ended dict
            # schemas on some model/API combinations. Use an explicit closed schema
            # and convert it to our flexible internal representation afterwards.
            response_schema=GeminiExtractionBundle,
        ),
    )

    if isinstance(response.parsed, GeminiExtractionBundle):
        gemini_bundle = response.parsed
    elif response.parsed is not None:
        gemini_bundle = GeminiExtractionBundle.model_validate(response.parsed)
    else:
        gemini_bundle = GeminiExtractionBundle.model_validate_json(response.text or "{}")

    obligations: list[ObligationCandidate] = []
    for item in gemini_bundle.obligations:
        source_clause = (item.source_clause or "").strip() or None
        description = item.description.strip()

        # The two fields serve different users: description is the normalized
        # operational requirement; source_clause is evidence from the agreement.
        # If the model repeats the evidence verbatim, normalize it ourselves.
        if source_clause and re.sub(r"\W+", "", description.lower()) == re.sub(r"\W+", "", source_clause.lower()):
            description, inferred_party = _normalized_description(source_clause)
            responsible_party = item.responsible_party or inferred_party
        else:
            responsible_party = item.responsible_party

        confidence, confidence_factors = _structured_confidence_for_gemini(item)

        rule_config = item.rule_config.model_dump(exclude_none=True)
        rule_config.update(
            {
                "extraction_mode": "gemini",
                "confidence_factors": confidence_factors,
            }
        )

        obligations.append(
            ObligationCandidate(
                obligation_type=item.obligation_type,
                title=item.title.strip(),
                description=description,
                responsible_party=responsible_party,
                owner_team=item.owner_team,
                risk_level=item.risk_level,
                confidence=confidence,
                source_clause=source_clause,
                source_page=item.source_page,
                source_text=None,
                rule_config=rule_config,
            )
        )

    bundle = ExtractionBundle(summary=gemini_bundle.summary.strip(), obligations=obligations)
    return bundle, "gemini", settings.gemini_model


def local_evaluate_evidence(
    *,
    obligation_title: str,
    obligation_description: str,
    expected: dict,
    observed_value: str,
    evidence_note: str | None,
) -> dict:
    observed_text = " ".join(filter(None, [observed_value, evidence_note or ""])).strip()
    observed_number_match = re.search(r"-?\d+(?:\.\d+)?", observed_value)
    observed_number = float(observed_number_match.group(0)) if observed_number_match else None
    threshold = expected.get("threshold") if isinstance(expected, dict) else None
    operator = expected.get("operator") if isinstance(expected, dict) else None

    compliant: bool | None = None
    confidence = 0.66
    finding: str

    if isinstance(threshold, (int, float)) and observed_number is not None and operator in {"<=", ">="}:
        compliant = observed_number <= float(threshold) if operator == "<=" else observed_number >= float(threshold)
        confidence = 0.93
        unit = expected.get("unit", "units")
        outcome = "meets" if compliant else "does not meet"
        finding = (
            f"Observed evidence is {observed_number:g} {unit}; the approved control requires "
            f"{operator} {float(threshold):g} {unit}. The evidence {outcome} the measurable threshold."
        )
    else:
        lowered = observed_text.lower()
        negative_terms = ("exceeded", "late", "missed", "failed", "breach", "not met", "outside", "after", "overdue")
        positive_terms = ("met", "compliant", "within target", "on time", "satisfied", "passed")
        if any(term in lowered for term in negative_terms):
            compliant = False
            confidence = 0.80
        elif any(term in lowered for term in positive_terms):
            compliant = True
            confidence = 0.76
        else:
            compliant = False
            confidence = 0.61
        finding = (
            f"Evidence review for '{obligation_title}' indicates "
            f"{'compliance' if compliant else 'a potential variance'}. "
            f"Observed evidence: {observed_value.strip()}"
        )

    recommended_action = (
        "Record the compliant evidence and continue monitoring."
        if compliant
        else "Open a controlled remediation work item, notify the obligation owner, and require human approval before external action."
    )

    return {
        "compliant": bool(compliant),
        "finding": finding,
        "recommended_action": recommended_action,
        "confidence": round(confidence, 2),
        "provider": "local_rules",
        "model": "python-evidence-evaluator-v2",
        "raw_evaluation": {
            "expected": expected,
            "observed": observed_value,
            "evidence_note": evidence_note,
        },
    }


def investigate_exception(
    *,
    obligation_title: str,
    obligation_description: str,
    expected: dict,
    observed: dict,
) -> tuple[str, str, float, str, str]:
    mode = settings.resolved_ai_mode
    if mode != "gemini" or not settings.gemini_api_key:
        result = local_evaluate_evidence(
            obligation_title=obligation_title,
            obligation_description=obligation_description,
            expected=expected,
            observed_value=str(observed.get("value", "")),
            evidence_note=observed.get("evidence_note"),
        )
        return (
            result["finding"],
            result["recommended_action"],
            result["confidence"],
            result["provider"],
            result["model"],
        )

    from google.genai import types

    class Investigation(BaseModel):
        finding: str
        recommended_action: str
        confidence: float = Field(ge=0, le=1)

    response = _gemini_client().models.generate_content(
        model=settings.gemini_model,
        contents=(
            f"Obligation: {obligation_title}\n"
            f"Description: {obligation_description}\n"
            f"Expected: {expected}\nObserved: {observed}\n"
            "Explain the variance conservatively and recommend a controlled next action."
        ),
        config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=Investigation,
        ),
    )
    if isinstance(response.parsed, Investigation):
        item = response.parsed
    elif response.parsed is not None:
        item = Investigation.model_validate(response.parsed)
    else:
        item = Investigation.model_validate_json(response.text or "{}")

    return item.finding, item.recommended_action, item.confidence, "gemini", settings.gemini_model

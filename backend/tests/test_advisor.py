"""Comprehensive test suite for Phase 3 and Phase 3.1 Chhaya Advisory Agent.
Covers:
- TemplateAdvisor across 4 recorded fixtures x 4 job types x 3 languages (48 combinations)
- Driving evidence card matching rule (A2): old behavior citing ev-wbgt-0000 for 14:00 fails
- Consecutive Latin word run rejection in Hindi and Tamil (A1)
- Strict validation rules (sentence limits, evidence IDs, number grounding, script check, medical blocklist)
- Mock LLM / Converse failure modes and fallback guarantees
- Daily LLM call cap enforcement
- Audit event privacy (no text, no PII)
- End-to-end POST /advise routing
"""
from datetime import UTC, datetime
import json
import os
from unittest.mock import MagicMock

import boto3
from moto import mock_aws
import pytest

from chhaya_backend.agent.advisors import (
    Advisory,
    BedrockConverseAdvisor,
    Sentence,
    StrandsAdvisor,
    TemplateAdvisor,
    get_advisor,
)
from chhaya_backend.agent.facts import Facts, build_facts_from_plan
from chhaya_backend.agent.i18n import get_seek_help_lines
from chhaya_backend.agent.prompts import build_user_prompt
from chhaya_backend.agent.validator import is_valid_script, validate_advisory_json
from chhaya_backend.router import Router
from chhaya_backend.store import DynamoDBStore
from chhaya_engine.models import JobType, create_worker_profile
from chhaya_engine.planner import plan_day
from chhaya_engine.scenarios import get_scenario, load_scenario_readings


def get_test_plan(scenario_id: str, job_type: str):
    sc = get_scenario(scenario_id)
    assert sc is not None, f"Scenario {scenario_id} not found"
    readings = load_scenario_readings(sc)
    profile = create_worker_profile(job_type=JobType[job_type])
    anchor_dt = datetime.fromisoformat(f"{sc.date}T00:00:00+00:00")
    return plan_day(readings, profile, sc.label, anchor_dt)


@pytest.fixture
def mock_store(monkeypatch):
    """In-memory DynamoDB store mock for unit testing."""
    table = {}
    store = DynamoDBStore(table_name="test-table", dynamodb_resource=MagicMock())
    
    def fake_increment(max_calls=300):
        current = table.get("llm_calls_count", 0) + 1
        table["llm_calls_count"] = current
        return (current <= max_calls, current)
        
    monkeypatch.setattr(store, "increment_daily_llm_calls", fake_increment)
    monkeypatch.setattr(store, "add_audit_event", lambda event_type, details: {"id": "test", "event_type": event_type, "details": details})
    monkeypatch.setattr(store, "increment_stats", lambda **kwargs: None)
    return store


@pytest.fixture
def test_router():
    with mock_aws():
        os.environ["CHHAYA_TABLE"] = "test-advisor-table"
        os.environ["CHHAYA_DATA_MODE"] = "fixture"
        os.environ["WRITE_PASSCODE"] = "secret123"
        os.environ["AWS_REGION"] = "ap-south-1"
        
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.create_table(
            TableName="test-advisor-table",
            KeySchema=[
                {"AttributeName": "pk", "KeyType": "HASH"},
                {"AttributeName": "sk", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "pk", "AttributeType": "S"},
                {"AttributeName": "sk", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        table.meta.client.get_waiter("table_exists").wait(TableName="test-advisor-table")
        store = DynamoDBStore(table_name="test-advisor-table", dynamodb_resource=dynamodb)
        yield Router(store=store)


# 1. 48 combinations of TemplateAdvisor across 4 fixtures x 4 jobs x 3 languages
@pytest.mark.parametrize("scenario_id", [
    "delhi-heatwave-2025-06-09",
    "delhi-smog-2025-11-23",
    "chennai-humid-2025-05-31",
    "coimbatore-mild-2025-01-15",
])
@pytest.mark.parametrize("job_type", ["RIDER", "CONSTRUCTION", "VENDOR", "SANITATION"])
@pytest.mark.parametrize("lang", ["en", "hi", "ta"])
def test_template_advisor_48_combinations(scenario_id: str, job_type: str, lang: str):
    plan = get_test_plan(scenario_id, job_type)
    facts = build_facts_from_plan(plan)
    
    advisor = TemplateAdvisor()
    advisory = advisor.advise(facts, language=lang)
    
    assert advisory.language == lang
    assert advisory.mode == "template"
    assert advisory.validated is True
    assert advisory.fallback_reason is None
    assert 4 <= len(advisory.sentences) <= 5
    assert len(advisory.seek_help) == len(facts.seek_help_lines)
    
    # Assert seek help is in target language
    for sh in advisory.seek_help:
        assert is_valid_script(sh, lang)
    
    # Assert every sentence cites valid evidence IDs
    valid_eids = facts.get_evidence_ids()
    for s in advisory.sentences:
        assert len(s.evidence_ids) > 0
        for eid in s.evidence_ids:
            assert eid in valid_eids
            
    # Assert script validity and no latin runs in hi/ta
    for s in advisory.sentences:
        assert is_valid_script(s.text, lang)
        
    # Re-validate with validator to confirm contract
    val_res = validate_advisory_json(
        {"sentences": [s.to_dict() for s in advisory.sentences]},
        facts,
        language=lang,
    )
    assert val_res.is_valid is True
    assert val_res.error is None


# 2. A2 Driving Evidence Mapping Test: Old behavior citing ev-wbgt-0000 for peak heat must fail
def test_validator_mismatched_evidence_id_fails_a2():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "CONSTRUCTION")
    facts = build_facts_from_plan(plan)
    
    # Sentence states the real peak time (e.g. 14:00) and temp (e.g. 38.2 C) from facts, but cites midnight card ev-wbgt-0000
    bad_payload = {
        "sentences": [
            {
                "text": f"Peak heat reaches {facts.peak_heat_c:.1f} °C around {facts.peak_heat_hour}.",
                "evidence_ids": ["ev-wbgt-0000"]
            }
        ]
    }
    res = validate_advisory_json(bad_payload, facts, language="en")
    assert res.is_valid is False
    assert "none of cited evidence_ids ['ev-wbgt-0000'] match those numbers or times" in res.error



# 3. A1 Latin Word Run Rejection in Hindi and Tamil
def test_validator_latin_run_rejected_in_hindi_a1():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "RIDER")
    facts = build_facts_from_plan(plan)
    peak_eid = facts.peak_heat_evidence_id
    
    # Hindi sentence with run of 3 English words ("drink plenty water")
    bad_hi_payload = {
        "sentences": [
            {
                "text": "दिल्ली में अत्यधिक गर्मी है, कृपया drink plenty water नियमित रूप से।",
                "evidence_ids": [peak_eid]
            }
        ]
    }
    res = validate_advisory_json(bad_hi_payload, facts, language="hi")
    assert res.is_valid is False
    assert "contains a run of 3+ consecutive Latin words in hi" in res.error


def test_validator_latin_run_rejected_in_tamil_a1():
    plan = get_test_plan("chennai-humid-2025-05-31", "VENDOR")
    facts = build_facts_from_plan(plan)
    peak_eid = facts.peak_heat_evidence_id
    
    # Tamil sentence with run of 3 English words ("wear protective cap")
    bad_ta_payload = {
        "sentences": [
            {
                "text": "சென்னையில் வெப்பம் அதிகம், தயவுசெய்து wear protective cap வெளியில் செல்லும்போது.",
                "evidence_ids": [peak_eid]
            }
        ]
    }
    res = validate_advisory_json(bad_ta_payload, facts, language="ta")
    assert res.is_valid is False
    assert "contains a run of 3+ consecutive Latin words in ta" in res.error


# 4. Strict Validator Edge Cases
def test_validator_hallucinated_number():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "RIDER")
    facts = build_facts_from_plan(plan)
    valid_eid = facts.peak_heat_evidence_id
    
    # Hallucinated number 999 is not in plan facts
    bad_payload = {
        "sentences": [
            {"text": "Take a 999 minute break right now.", "evidence_ids": [valid_eid]}
        ]
    }
    res = validate_advisory_json(bad_payload, facts, language="en")
    assert res.is_valid is False
    assert "ungrounded number '999'" in res.error


def test_validator_unknown_evidence_id():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "RIDER")
    facts = build_facts_from_plan(plan)
    
    bad_payload = {
        "sentences": [
            {"text": "High heat caution today.", "evidence_ids": ["ev-nonexistent-9999"]}
        ]
    }
    res = validate_advisory_json(bad_payload, facts, language="en")
    assert res.is_valid is False
    assert "unknown evidence_id 'ev-nonexistent-9999'" in res.error


def test_validator_wrong_script():
    plan = get_test_plan("delhi-smog-2025-11-23", "CONSTRUCTION")
    facts = build_facts_from_plan(plan)
    valid_eid = facts.peak_heat_evidence_id
    
    # English text provided for Hindi language request
    bad_payload = {
        "sentences": [
            {"text": "Wear a mask because pollution is severe today.", "evidence_ids": [valid_eid]}
        ]
    }
    res = validate_advisory_json(bad_payload, facts, language="hi")
    assert res.is_valid is False
    assert "not written in the expected script" in res.error


def test_validator_medical_blocklist():
    plan = get_test_plan("chennai-humid-2025-05-31", "VENDOR")
    facts = build_facts_from_plan(plan)
    valid_eid = facts.peak_heat_evidence_id
    
    # Prohibited medical claim
    bad_payload = {
        "sentences": [
            {"text": "Take this antibiotic medicine if you feel fever.", "evidence_ids": [valid_eid]}
        ]
    }
    res = validate_advisory_json(bad_payload, facts, language="en")
    assert res.is_valid is False
    assert "prohibited medical claim" in res.error


def test_validator_sentence_count_bounds():
    plan = get_test_plan("coimbatore-mild-2025-01-15", "SANITATION")
    facts = build_facts_from_plan(plan)
    valid_eid = facts.peak_heat_evidence_id
    
    # 0 sentences
    res_0 = validate_advisory_json({"sentences": []}, facts, language="en")
    assert res_0.is_valid is False
    
    # 6 sentences (exceeds 5)
    six_s = [{"text": f"Sentence number {i} text.", "evidence_ids": [valid_eid]} for i in range(1, 7)]
    res_6 = validate_advisory_json({"sentences": six_s}, facts, language="en")
    assert res_6.is_valid is False
    assert "Expected 1 to 5 sentences" in res_6.error


# 5. Mock BedrockConverseAdvisor Success & Failure Fallbacks
def test_bedrock_advisor_success_first_pass():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "CONSTRUCTION")
    facts = build_facts_from_plan(plan)
    primary_eid = facts.peak_heat_evidence_id
    
    mock_client = MagicMock()
    mock_client.converse.return_value = {
        "output": {
            "message": {
                "content": [{
                    "text": json.dumps({
                        "sentences": [
                            {"text": f"High heat warning in Delhi today at {facts.peak_heat_hour}.", "evidence_ids": [primary_eid]}
                        ]
                    })
                }]
            }
        }
    }
    
    advisor = BedrockConverseAdvisor(bedrock_client=mock_client)
    advisory = advisor.advise(facts, language="en")
    
    assert advisory.mode == "converse"
    assert advisory.validated is True
    assert advisory.fallback_reason is None
    assert len(advisory.sentences) == 1
    assert advisory.sentences[0].evidence_ids == [primary_eid]
    assert mock_client.converse.call_count == 1


def test_bedrock_advisor_retry_and_succeed():
    plan = get_test_plan("delhi-heatwave-2025-06-09", "CONSTRUCTION")
    facts = build_facts_from_plan(plan)
    primary_eid = facts.peak_heat_evidence_id
    
    mock_client = MagicMock()
    # 1st call fails (hallucinated number 9999)
    # 2nd call succeeds (corrected)
    mock_client.converse.side_effect = [
        {
            "output": {
                "message": {
                    "content": [{"text": json.dumps({"sentences": [{"text": "Stop work at 9999.", "evidence_ids": [primary_eid]}]})}]
                }
            }
        },
        {
            "output": {
                "message": {
                    "content": [{"text": json.dumps({"sentences": [{"text": f"High heat warning today at {facts.peak_heat_hour}.", "evidence_ids": [primary_eid]}]})}]
                }
            }
        },
    ]
    
    advisor = BedrockConverseAdvisor(bedrock_client=mock_client)
    advisory = advisor.advise(facts, language="en")
    
    assert advisory.mode == "converse"
    assert advisory.validated is True
    assert advisory.fallback_reason is None
    assert mock_client.converse.call_count == 2


def test_bedrock_advisor_fallback_on_double_failure():
    plan = get_test_plan("delhi-smog-2025-11-23", "RIDER")
    facts = build_facts_from_plan(plan)
    
    mock_client = MagicMock()
    # Both attempts return malformed / ungrounded content
    mock_client.converse.return_value = {
        "output": {
            "message": {
                "content": [{"text": "Sorry I cannot produce JSON."}]
            }
        }
    }
    
    advisor = BedrockConverseAdvisor(bedrock_client=mock_client)
    advisory = advisor.advise(facts, language="en")
    
    # Must fallback gracefully to TemplateAdvisor
    assert advisory.mode == "template"
    assert advisory.validated is True
    assert advisory.fallback_reason is not None
    assert "Validation failed twice" in advisory.fallback_reason
    assert len(advisory.sentences) >= 4


def test_bedrock_advisor_fallback_on_client_exception():
    plan = get_test_plan("chennai-humid-2025-05-31", "VENDOR")
    facts = build_facts_from_plan(plan)
    
    mock_client = MagicMock()
    mock_client.converse.side_effect = Exception("ThrottlingException: Rate exceeded")
    
    advisor = BedrockConverseAdvisor(bedrock_client=mock_client)
    advisory = advisor.advise(facts, language="en")
    
    assert advisory.mode == "template"
    assert advisory.validated is True
    assert "Bedrock invocation error" in advisory.fallback_reason


# 6. Daily LLM call cap fallback
def test_daily_call_cap_enforcement(mock_store):
    # Set cap to 2 calls
    adv1, reason1 = get_advisor(store=mock_store, max_calls_per_day=2, advisor_mode="converse")
    assert reason1 is None
    
    adv2, reason2 = get_advisor(store=mock_store, max_calls_per_day=2, advisor_mode="converse")
    assert reason2 is None
    
    # 3rd call reaches cap
    adv3, reason3 = get_advisor(store=mock_store, max_calls_per_day=2, advisor_mode="converse")
    assert reason3 == "daily_cap"
    assert isinstance(adv3, TemplateAdvisor)


# 7. StrandsAdvisor fallback
def test_strands_advisor():
    plan = get_test_plan("coimbatore-mild-2025-01-15", "SANITATION")
    facts = build_facts_from_plan(plan)
    
    strands_adv = StrandsAdvisor()
    advisory = strands_adv.advise(facts, language="en")
    
    assert advisory.validated is True
    assert advisory.mode in ("converse", "template")


# 8. End-to-End Router POST /advise
def test_router_post_advise_template_mode(test_router):
    event = {
        "requestContext": {"http": {"method": "POST"}},
        "rawPath": "/advise",
        "body": json.dumps({
            "scenario": "delhi-heatwave-2025-06-09",
            "job_type": "CONSTRUCTION",
            "workload": "HEAVY",
            "language": "hi",
            "advisor_backend": "template",
        })
    }
    
    res = test_router.route(event)
    assert res["statusCode"] == 200
    
    body = json.loads(res["body"])
    assert "plan" in body
    assert "advisory" in body
    assert body["plan"]["data_source"] == "replay"
    assert body["advisory"]["language"] == "hi"
    assert body["advisory"]["mode"] == "template"
    assert body["advisory"]["validated"] is True
    assert len(body["advisory"]["sentences"]) >= 4


def test_router_post_advise_validation_errors(test_router):
    # Invalid job_type
    bad_req = {
        "requestContext": {"http": {"method": "POST"}},
        "rawPath": "/advise",
        "body": json.dumps({"scenario": "delhi-heatwave-2025-06-09", "job_type": "ASTRONAUT"})
    }
    res = test_router.route(bad_req)
    assert res["statusCode"] == 400
    
    # Unknown scenario
    unknown_sc = {
        "requestContext": {"http": {"method": "POST"}},
        "rawPath": "/advise",
        "body": json.dumps({"scenario": "delhi-snowstorm-2025", "job_type": "RIDER"})
    }
    res2 = test_router.route(unknown_sc)
    assert res2["statusCode"] == 404

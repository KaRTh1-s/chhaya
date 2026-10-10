"""Tests for API Gateway router, endpoints, validation, and authentication."""
import json
import os
from datetime import UTC

import boto3
import pytest
from moto import mock_aws

from chhaya_backend.router import Router
from chhaya_backend.store import DynamoDBStore


@pytest.fixture
def test_router():
    with mock_aws():
        os.environ["CHHAYA_TABLE"] = "test-router-table"
        os.environ["CHHAYA_DATA_MODE"] = "fixture"
        os.environ["WRITE_PASSCODE"] = "secret123"
        os.environ["AWS_REGION"] = "ap-south-1"
        
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.create_table(
            TableName="test-router-table",
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
        table.meta.client.get_waiter("table_exists").wait(TableName="test-router-table")
        store = DynamoDBStore(table_name="test-router-table", dynamodb_resource=dynamodb)
        yield Router(store=store)

def make_event(
    method: str,
    path: str,
    body: dict | None = None,
    headers: dict | None = None,
    query: dict | None = None
) -> dict:
    return {
        "version": "2.0",
        "routeKey": f"{method} {path}",
        "rawPath": path,
        "rawQueryString": "",
        "headers": headers or {},
        "queryStringParameters": query or {},
        "requestContext": {
            "http": {
                "method": method,
                "path": path,
            },
            "requestId": "test-req-123",
        },
        "body": json.dumps(body) if body is not None else None,
        "isBase64Encoded": False,
    }

def test_health_endpoint(test_router):
    event = make_event("GET", "/health")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in resp["headers"]
    data = json.loads(resp["body"])
    assert data["status"] == "ok"
    assert data["data_mode"] == "fixture"
    assert "time" in data

def test_cities_endpoint(test_router):
    event = make_event("GET", "/cities")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "cities" in data
    assert len(data["cities"]) >= 8
    assert any(c["id"] == "delhi" for c in data["cities"])

def test_plan_endpoint_success(test_router):
    event = make_event("POST", "/plan", body={
        "city_id": "delhi",
        "job_type": "CONSTRUCTION",
        "workload": "HEAVY",
    })
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert data["city_label"] == "Delhi"
    assert len(data["hours"]) == 24
    assert "windows" in data
    assert "recommended_blocks" in data

def test_plan_endpoint_lat_lon_success(test_router):
    event = make_event("POST", "/plan", body={
        "lat": 13.08,
        "lon": 80.27,
        "job_type": "RIDER",
    })
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "Location (13.08, 80.27)" in data["city_label"]

def test_plan_endpoint_validation_errors(test_router):
    # Out of India bounding box
    event1 = make_event("POST", "/plan", body={"lat": 51.50, "lon": 0.12, "job_type": "RIDER"})
    resp1 = test_router.route(event1)
    assert resp1["statusCode"] == 400
    assert "bounding box" in json.loads(resp1["body"])["error"]["message"]

    # Invalid job type
    event2 = make_event("POST", "/plan", body={"city_id": "delhi", "job_type": "ASTRONAUT"})
    resp2 = test_router.route(event2)
    assert resp2["statusCode"] == 400
    assert "Invalid job_type" in json.loads(resp2["body"])["error"]["message"]

    # Invalid shift hours
    event3 = make_event("POST", "/plan", body={
        "city_id": "delhi",
        "job_type": "RIDER",
        "preferred_start_hour": 18,
        "preferred_end_hour": 6, # start >= end
    })
    resp3 = test_router.route(event3)
    assert resp3["statusCode"] == 400
    assert "strictly less than" in json.loads(resp3["body"])["error"]["message"]

def test_board_endpoint(test_router):
    event = make_event("GET", "/board")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "cities" in data
    assert len(data["cities"]) >= 3
    assert "jobs" in data["cities"][0]
    assert "RIDER" in data["cities"][0]["jobs"]

def test_stats_endpoint(test_router):
    event = make_event("GET", "/stats")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "plans_generated" in data
    assert "hours_flagged" in data
    assert "cities_covered" in data

def test_audit_endpoint(test_router):
    event = make_event("GET", "/audit", query={"limit": "5"})
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "audit_events" in data

def test_crews_crud_flow_and_auth(test_router):
    # 1. Create crew without passcode -> 401
    event_no_auth = make_event("POST", "/crews", body={
        "name": "Coimbatore Delivery Hub",
        "city_id": "coimbatore",
        "job_type": "RIDER",
        "size": 10,
    })
    resp_no_auth = test_router.route(event_no_auth)
    assert resp_no_auth["statusCode"] == 401

    # 2. Create crew with wrong passcode -> 401
    event_wrong_auth = make_event("POST", "/crews", body={
        "name": "Coimbatore Delivery Hub",
        "city_id": "coimbatore",
        "job_type": "RIDER",
        "size": 10,
    }, headers={"X-Chhaya-Passcode": "wrongpass"})
    resp_wrong_auth = test_router.route(event_wrong_auth)
    assert resp_wrong_auth["statusCode"] == 401

    # 3. Create crew with valid passcode -> 201
    event_valid = make_event("POST", "/crews", body={
        "name": "Coimbatore Delivery Hub",
        "city_id": "coimbatore",
        "job_type": "RIDER",
        "size": 10,
    }, headers={"X-Chhaya-Passcode": "secret123"})
    resp_valid = test_router.route(event_valid)
    assert resp_valid["statusCode"] == 201
    created_crew = json.loads(resp_valid["body"])["crew"]
    crew_id = created_crew["id"]

    # 4. List crews -> 200 (public)
    event_list = make_event("GET", "/crews")
    resp_list = test_router.route(event_list)
    assert resp_list["statusCode"] == 200
    crews_list = json.loads(resp_list["body"])["crews"]
    assert any(c["id"] == crew_id for c in crews_list)

    # 5. Get single crew with plan -> 200
    event_get = make_event("GET", f"/crews/{crew_id}")
    resp_get = test_router.route(event_get)
    assert resp_get["statusCode"] == 200
    crew_data = json.loads(resp_get["body"])["crew"]
    assert "plan_summary" in crew_data
    assert crew_data["plan_summary"]["city_name"] == "Coimbatore"

    # 6. Delete crew without passcode -> 401
    event_del_no_auth = make_event("DELETE", f"/crews/{crew_id}")
    resp_del_no_auth = test_router.route(event_del_no_auth)
    assert resp_del_no_auth["statusCode"] == 401

    # 7. Delete crew with passcode -> 200
    event_del_auth = make_event("DELETE", f"/crews/{crew_id}", headers={"X-Chhaya-Passcode": "secret123"})
    resp_del_auth = test_router.route(event_del_auth)
    assert resp_del_auth["statusCode"] == 200
    assert json.loads(resp_del_auth["body"])["deleted"] is True

def test_cors_options_preflight(test_router):
    event = make_event("OPTIONS", "/plan")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in resp["headers"]
    assert "Access-Control-Allow-Methods" in resp["headers"]

def test_unknown_route_returns_404(test_router):
    event = make_event("GET", "/non_existent_path")
    resp = test_router.route(event)
    assert resp["statusCode"] == 404
    data = json.loads(resp["body"])
    assert data["error"]["code"] == "NOT_FOUND"

def test_plan_missing_body_and_malformed_json(test_router):
    # Missing body
    event_no_body = make_event("POST", "/plan")
    event_no_body["body"] = None
    resp_no_body = test_router.route(event_no_body)
    assert resp_no_body["statusCode"] == 400

    # Malformed JSON
    event_bad_json = make_event("POST", "/plan")
    event_bad_json["body"] = "{malformed-json"
    resp_bad_json = test_router.route(event_bad_json)
    assert resp_bad_json["statusCode"] == 400

def test_crew_creation_validation_errors(test_router):
    # Missing body
    event_no_body = make_event("POST", "/crews", headers={"X-Chhaya-Passcode": "secret123"})
    event_no_body["body"] = None
    assert test_router.route(event_no_body)["statusCode"] == 400

    # Malformed JSON
    event_bad_json = make_event("POST", "/crews", headers={"X-Chhaya-Passcode": "secret123"})
    event_bad_json["body"] = "{invalid"
    assert test_router.route(event_bad_json)["statusCode"] == 400

    # Empty name
    event_empty_name = make_event("POST", "/crews", body={"name": "", "city_id": "delhi", "job_type": "RIDER"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_empty_name)["statusCode"] == 400

    # Missing city
    event_no_city = make_event("POST", "/crews", body={"name": "Crew A", "job_type": "RIDER"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_no_city)["statusCode"] == 400

    # Unknown city
    event_bad_city = make_event("POST", "/crews", body={"name": "Crew A", "city_id": "atlantis", "job_type": "RIDER"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_bad_city)["statusCode"] == 400

    # Missing job_type
    event_no_job = make_event("POST", "/crews", body={"name": "Crew A", "city_id": "delhi"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_no_job)["statusCode"] == 400

    # Invalid job_type
    event_bad_job = make_event("POST", "/crews", body={"name": "Crew A", "city_id": "delhi", "job_type": "DIVER"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_bad_job)["statusCode"] == 400

    # Invalid workload
    event_bad_workload = make_event("POST", "/crews", body={"name": "Crew A", "city_id": "delhi", "job_type": "RIDER", "workload": "EXTREME"}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_bad_workload)["statusCode"] == 400

    # Invalid size
    event_bad_size = make_event("POST", "/crews", body={"name": "Crew A", "city_id": "delhi", "job_type": "RIDER", "size": 0}, headers={"X-Chhaya-Passcode": "secret123"})
    assert test_router.route(event_bad_size)["statusCode"] == 400

def test_live_data_mode_and_caching(test_router):
    test_router.config = test_router.config.__class__(
        table_name="test-router-table",
        data_mode="live",
        write_passcode="secret123",
        cors_origin="*",
        bedrock_region="us-east-1",
        app_version="0.2.0",
        aws_region="ap-south-1",
    )
    test_router.plan_service.config = test_router.config

    # Mock openmeteo client fetch_forecast
    from datetime import datetime

    from chhaya_engine.models import HourlyReading
    sample_readings = [
        HourlyReading(datetime(2026, 5, 1, i, 0, tzinfo=UTC), 30.0, 50.0, 200.0, 2.0, 50.0, 60.0)
        for i in range(24)
    ]
    test_router.plan_service.openmeteo.fetch_forecast = lambda lat, lon: sample_readings

    # First request: Cache miss -> fetches live -> puts to cache
    event = make_event("POST", "/plan", body={"city_id": "bengaluru", "job_type": "VENDOR"})
    resp1 = test_router.route(event)
    assert resp1["statusCode"] == 200

    # Second request: Cache hit from DynamoDB
    resp2 = test_router.route(event)
    assert resp2["statusCode"] == 200

def test_get_scenarios_endpoint(test_router):
    event = make_event("GET", "/scenarios")
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert "scenarios" in data
    assert len(data["scenarios"]) == 4
    expected_ids = {
        "delhi-heatwave-2025-06-09",
        "delhi-smog-2025-11-23",
        "chennai-humid-2025-05-31",
        "coimbatore-mild-2025-01-15",
    }
    actual_ids = {s["id"] for s in data["scenarios"]}
    assert actual_ids == expected_ids
    for s in data["scenarios"]:
        assert s["source"] == "recorded"
        assert "max_temp_c" in s
        assert "max_pm2_5" in s
        assert "date" in s

def test_plan_scenario_replay(test_router):
    event = make_event("POST", "/plan", body={
        "scenario": "delhi-heatwave-2025-06-09",
        "job_type": "CONSTRUCTION"
    })
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert data["data_source"] == "replay"
    assert data["scenario_id"] == "delhi-heatwave-2025-06-09"
    assert data["recorded_date"] == "2025-06-09"
    assert data["city_label"] == "Delhi"

def test_board_replay_mode(test_router):
    event = make_event("GET", "/board", query={"mode": "replay"})
    resp = test_router.route(event)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert data["mode"] == "replay"
    assert len(data["cities"]) == 4
    for entry in data["cities"]:
        assert "scenario_id" in entry
        assert "label" in entry
        assert "date" in entry
        assert "jobs" in entry

def test_fixture_mode_unknown_city_returns_404(test_router):
    event = make_event("POST", "/plan", body={"city_id": "mumbai", "job_type": "VENDOR"})
    resp = test_router.route(event)
    assert resp["statusCode"] == 404
    data = json.loads(resp["body"])
    assert "Supported fixture cities" in data["error"]["message"]

def test_response_hygiene_no_dynamodb_keys_across_all_endpoints(test_router):
    """A5: Never return DynamoDB keys (pk, sk, ttl) in any API response."""
    # Seed a crew
    post_crew = make_event("POST", "/crews", body={"name": "Alpha Crew", "city_id": "delhi", "job_type": "RIDER"}, headers={"X-Chhaya-Passcode": "secret123"})
    resp_crew = test_router.route(post_crew)
    assert resp_crew["statusCode"] == 201

    endpoints = [
        make_event("GET", "/health"),
        make_event("GET", "/cities"),
        make_event("GET", "/scenarios"),
        make_event("POST", "/plan", body={"city_id": "delhi", "job_type": "RIDER"}),
        make_event("GET", "/board"),
        make_event("GET", "/board", query={"mode": "replay"}),
        make_event("GET", "/stats"),
        make_event("GET", "/audit"),
        make_event("GET", "/crews"),
    ]

    for ev in endpoints:
        resp = test_router.route(ev)
        raw_body = resp["body"]
        data = json.loads(raw_body)
        
        def check_no_keys(obj, path="", endpoint=ev["rawPath"]):
            if isinstance(obj, dict):
                for k in ["pk", "sk", "ttl", "readings_json", "details_json"]:
                    assert k not in obj, f"Forbidden DynamoDB key '{k}' found at {path} in endpoint {endpoint}"
                for k, v in obj.items():
                    check_no_keys(v, f"{path}.{k}", endpoint=endpoint)
            elif isinstance(obj, list):
                for i, it in enumerate(obj):
                    check_no_keys(it, f"{path}[{i}]", endpoint=endpoint)

        check_no_keys(data)



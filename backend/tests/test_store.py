"""Tests for DynamoDB single-table storage operations using moto."""
import os

import boto3
import pytest
from moto import mock_aws

from chhaya_backend.store import DynamoDBStore


@pytest.fixture
def mock_dynamodb_store():
    with mock_aws():
        os.environ["CHHAYA_TABLE"] = "test-chhaya-table"
        os.environ["AWS_REGION"] = "ap-south-1"
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        table = dynamodb.create_table(
            TableName="test-chhaya-table",
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
        table.meta.client.get_waiter("table_exists").wait(TableName="test-chhaya-table")
        yield DynamoDBStore(table_name="test-chhaya-table", dynamodb_resource=dynamodb)

def test_readings_cache(mock_dynamodb_store):
    store = mock_dynamodb_store
    loc_key = "28.61_77.23"
    
    # Cache miss
    assert store.get_readings_cache(loc_key) is None
    
    # Cache put
    sample_readings = [{"temp_c": 35.0, "rh_pct": 50.0, "time": "2026-05-01T12:00:00+05:30"}]
    store.put_readings_cache(loc_key, sample_readings, ttl_seconds=1800)
    
    # Cache hit
    cached = store.get_readings_cache(loc_key)
    assert cached is not None
    assert len(cached) == 1
    assert cached[0]["temp_c"] == 35.0

def test_crew_crud(mock_dynamodb_store):
    store = mock_dynamodb_store
    
    # Save crew
    crew_data = {
        "name": "Delhi Quick Riders",
        "city_id": "delhi",
        "job_type": "RIDER",
        "workload": "MODERATE",
        "size": 12,
    }
    saved = store.save_crew(crew_data)
    crew_id = saved["id"]
    assert crew_id is not None
    assert saved["name"] == "Delhi Quick Riders"
    
    # Get crew
    fetched = store.get_crew(crew_id)
    assert fetched is not None
    assert fetched["id"] == crew_id
    assert fetched["size"] == 12
    
    # List crews
    crews = store.list_crews()
    assert len(crews) >= 1
    assert any(c["id"] == crew_id for c in crews)
    
    # Delete crew
    assert store.delete_crew(crew_id) is True
    assert store.get_crew(crew_id) is None

def test_stats_increments(mock_dynamodb_store):
    store = mock_dynamodb_store
    
    # Initial stats
    stats0 = store.get_stats()
    assert stats0["plans_generated"] == 0
    assert stats0["hours_flagged"] == 0
    
    # Increment
    store.increment_stats(plans=2, hours_flagged=6, lead_time_sum=8.0, lead_time_count=2)
    stats1 = store.get_stats()
    assert stats1["plans_generated"] == 2
    assert stats1["hours_flagged"] == 6
    assert stats1["avg_lead_time_hours"] == 4.0

def test_audit_no_personal_data(mock_dynamodb_store):
    store = mock_dynamodb_store
    
    # Log event containing personal data attempts (should be stripped)
    store.add_audit_event("TEST_EVENT", {
        "action": "registered",
        "city": "Delhi",
        "name": "Ramesh Kumar", # PII to strip
        "phone": "+919876543210", # PII to strip
    })
    
    events = store.get_audit_events(limit=10)
    assert len(events) >= 1
    latest = events[0]
    assert latest["event_type"] == "TEST_EVENT"
    assert "name" not in latest["details"]
    assert "phone" not in latest["details"]
    assert latest["details"]["city"] == "Delhi"

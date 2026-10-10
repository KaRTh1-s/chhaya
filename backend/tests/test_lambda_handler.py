"""Tests for Lambda API entry point handler."""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import boto3
import pytest
from moto import mock_aws

# Ensure backend and handlers are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from handlers.api import handler


@pytest.fixture
def mock_env():
    with mock_aws():
        os.environ["CHHAYA_TABLE"] = "test-lambda-table"
        os.environ["CHHAYA_DATA_MODE"] = "fixture"
        os.environ["WRITE_PASSCODE"] = "demo"
        os.environ["AWS_REGION"] = "ap-south-1"
        
        dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
        dynamodb.create_table(
            TableName="test-lambda-table",
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
        yield

def test_handler_health_check(mock_env):
    event = {
        "version": "2.0",
        "routeKey": "GET /health",
        "rawPath": "/health",
        "rawQueryString": "",
        "headers": {},
        "requestContext": {
            "http": {"method": "GET", "path": "/health"},
            "requestId": "lambda-req-001",
        },
        "isBase64Encoded": False,
    }
    
    resp = handler(event, None)
    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert data["status"] == "ok"
    assert "version" in data

def test_handler_unhandled_exception_no_stack_leak(mock_env):
    event = {
        "version": "2.0",
        "routeKey": "GET /health",
        "rawPath": "/health",
        "requestContext": {"http": {"method": "GET", "path": "/health"}},
    }
    
    # Patch router to raise an unexpected exception
    with patch("handlers.api.get_router", side_effect=RuntimeError("Secret database connection failure")):
        resp = handler(event, None)
        assert resp["statusCode"] == 500
        data = json.loads(resp["body"])
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
        # Verify stack trace and internal error message are NOT leaked
        assert "Secret database connection failure" not in resp["body"]
        assert "Traceback" not in resp["body"]

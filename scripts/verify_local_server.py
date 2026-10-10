"""Verification script for testing local standalone HTTP server endpoints."""
import json
import os
import sys
import threading
import time
import urllib.request
import urllib.error

sys.path.extend(["engine/src", "backend/src", "backend"])
from chhaya_backend.local_server import LambdaGatewayHandler, setup_mock_dynamodb, HTTPServer
from moto import mock_aws

def run_local_smoke(port=8799):
    os.environ["CHHAYA_TABLE"] = "chhaya-data"
    os.environ["CHHAYA_DATA_MODE"] = "fixture"
    os.environ["WRITE_PASSCODE"] = "demo"
    os.environ["AWS_REGION"] = "ap-south-1"
    os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
    os.environ["AWS_ACCESS_KEY_ID"] = "mock_key"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mock_secret"

    mocker = mock_aws()
    mocker.start()
    setup_mock_dynamodb("chhaya-data", "ap-south-1")

    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, LambdaGatewayHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"
    print(f"Local server started on {base_url}\n")

    endpoints = [
        {"name": "GET /health", "method": "GET", "path": "/health", "body": None, "headers": {}},
        {"name": "GET /cities", "method": "GET", "path": "/cities", "body": None, "headers": {}},
        {"name": "GET /scenarios", "method": "GET", "path": "/scenarios", "body": None, "headers": {}},
        {"name": "GET /stats", "method": "GET", "path": "/stats", "body": None, "headers": {}},
        {
            "name": "POST /plan (Recorded Heatwave, Construction Heavy)",
            "method": "POST",
            "path": "/plan",
            "body": {
                "scenario": "delhi-heatwave-2025-06-09",
                "job_type": "CONSTRUCTION",
                "workload": "HEAVY"
            },
            "headers": {"Content-Type": "application/json"}
        },
        {
            "name": "POST /advise (Template EN)",
            "method": "POST",
            "path": "/advise",
            "body": {
                "scenario": "delhi-heatwave-2025-06-09",
                "job_type": "CONSTRUCTION",
                "workload": "HEAVY",
                "language": "en",
                "advisor_backend": "template"
            },
            "headers": {"Content-Type": "application/json"}
        },
        {
            "name": "POST /advise (Template HI)",
            "method": "POST",
            "path": "/advise",
            "body": {
                "scenario": "delhi-heatwave-2025-06-09",
                "job_type": "CONSTRUCTION",
                "workload": "HEAVY",
                "language": "hi",
                "advisor_backend": "template"
            },
            "headers": {"Content-Type": "application/json"}
        },
        {
            "name": "POST /advise (Template TA)",
            "method": "POST",
            "path": "/advise",
            "body": {
                "scenario": "delhi-heatwave-2025-06-09",
                "job_type": "CONSTRUCTION",
                "workload": "HEAVY",
                "language": "ta",
                "advisor_backend": "template"
            },
            "headers": {"Content-Type": "application/json"}
        },
        {"name": "GET /board?mode=replay", "method": "GET", "path": "/board?mode=replay", "body": None, "headers": {}},
        {"name": "GET /audit?limit=3", "method": "GET", "path": "/audit?limit=3", "body": None, "headers": {}},
    ]

    all_passed = True
    print(f"{'Endpoint':<52} {'Status':<8} {'JSON':<6} {'No Leaks':<10} {'Result'}")
    print("-" * 88)

    for ep in endpoints:
        url = f"{base_url}{ep['path']}"
        req_data = json.dumps(ep['body']).encode("utf-8") if ep['body'] else None
        req = urllib.request.Request(url, data=req_data, headers=ep['headers'], method=ep['method'])
        
        status = 0
        valid_json = False
        no_leaks = True
        body_dict = None
        error_msg = ""

        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                raw_text = resp.read().decode("utf-8")
                try:
                    body_dict = json.loads(raw_text)
                    valid_json = True
                    # Check for leaked internal DynamoDB keys
                    raw_dump = json.dumps(body_dict)
                    if '"pk"' in raw_dump or '"sk"' in raw_dump or '"ttl"' in raw_dump:
                        no_leaks = False
                except Exception as e:
                    valid_json = False
                    error_msg = f"JSON decode error: {e}"
        except urllib.error.HTTPError as he:
            status = he.code
            error_msg = f"HTTP {he.code}"
        except Exception as e:
            error_msg = str(e)

        # Endpoint specific assertions
        passed = (status == 200) and valid_json and no_leaks
        if ep['path'] == "/plan" and body_dict:
            if body_dict.get("data_source") != "replay" or body_dict.get("scenario_id") != "delhi-heatwave-2025-06-09":
                passed = False
                error_msg += " [scenario_id/data_source mismatch]"

        if "/advise" in ep['path'] and body_dict:
            adv = body_dict.get("advisory", {})
            if not adv.get("validated"):
                passed = False
                error_msg += " [advisory not validated]"

        if not passed:
            all_passed = False

        res_str = "PASS" if passed else f"FAIL ({error_msg})"
        print(f"{ep['name']:<52} {status:<8} {'YES' if valid_json else 'NO':<6} {'YES' if no_leaks else 'LEAKED':<10} {res_str}")

    httpd.shutdown()
    mocker.stop()
    print("-" * 88)
    print(f"Overall local smoke result: {'ALL PASSED' if all_passed else 'FAILURES DETECTED'}")
    return all_passed

if __name__ == "__main__":
    success = run_local_smoke()
    sys.exit(0 if success else 1)

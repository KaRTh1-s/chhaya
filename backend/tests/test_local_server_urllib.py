"""Integration test for local server over real HTTP using urllib."""
import json
import socket
import threading
import time
import urllib.error
import urllib.request
from http.server import HTTPServer

import pytest
from moto import mock_aws

from chhaya_backend.local_server import LambdaGatewayHandler, setup_mock_dynamodb


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

@pytest.fixture(scope="module")
def running_server():
    mocker = mock_aws()
    mocker.start()
    
    port = get_free_port()
    setup_mock_dynamodb("chhaya-data", "ap-south-1")
    
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, LambdaGatewayHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    
    time.sleep(0.3)
    base_url = f"http://127.0.0.1:{port}"
    yield base_url
    
    httpd.shutdown()
    httpd.server_close()
    mocker.stop()

def test_urllib_health_cors(running_server):
    req = urllib.request.Request(f"{running_server}/health")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        headers = dict(resp.getheaders())
        assert headers.get("Access-Control-Allow-Origin") == "*"
        body = json.loads(resp.read().decode("utf-8"))
        assert body["status"] == "ok"

def test_urllib_options_preflight(running_server):
    req = urllib.request.Request(f"{running_server}/crews", method="OPTIONS")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        headers = dict(resp.getheaders())
        assert headers.get("Access-Control-Allow-Origin") == "*"
        assert "POST" in headers.get("Access-Control-Allow-Methods", "")

def test_urllib_unauthorized_401_error_json(running_server):
    """A5: 401 returns real HTTP 401 with error JSON and CORS headers."""
    payload = json.dumps({"name": "Test Crew", "city_id": "delhi", "job_type": "RIDER"}).encode("utf-8")
    req = urllib.request.Request(
        f"{running_server}/crews",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        urllib.request.urlopen(req)
        pytest.fail("Expected HTTPError 401")
    except urllib.error.HTTPError as e:
        assert e.code == 401
        headers = dict(e.headers)
        assert headers.get("Access-Control-Allow-Origin") == "*"
        err_body = json.loads(e.read().decode("utf-8"))
        assert err_body["error"]["code"] == "UNAUTHORIZED"
        assert "Invalid or missing X-Chhaya-Passcode" in err_body["error"]["message"]

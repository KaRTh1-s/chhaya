"""Tests for local mock server setup and request translation."""
import os

from moto import mock_aws

from chhaya_backend.local_server import setup_mock_dynamodb


def test_setup_mock_dynamodb():
    with mock_aws():
        os.environ["AWS_REGION"] = "ap-south-1"
        os.environ.pop("CHHAYA_SEED_DEMO", None)
        dynamodb = setup_mock_dynamodb("test-local-table", "ap-south-1")
        table = dynamodb.Table("test-local-table")
        
        # Verify demo crews are seeded
        crew_resp = table.get_item(Key={"pk": "CREW#delhi-riders", "sk": "CREW"})
        assert "Item" in crew_resp
        assert crew_resp["Item"]["name"] == "Delhi Central Delivery Fleet"

        # Verify initial stats are NOT seeded when CHHAYA_SEED_DEMO is not set
        stats_resp = table.get_item(Key={"pk": "STATS#GLOBAL", "sk": "STATS"})
        assert "Item" not in stats_resp

    with mock_aws():
        os.environ["AWS_REGION"] = "ap-south-1"
        os.environ["CHHAYA_SEED_DEMO"] = "1"
        dynamodb = setup_mock_dynamodb("test-local-table-seeded", "ap-south-1")
        table = dynamodb.Table("test-local-table-seeded")
        stats_resp = table.get_item(Key={"pk": "STATS#GLOBAL", "sk": "STATS"})
        assert "Item" in stats_resp
        assert stats_resp["Item"]["plans_generated"] == 142

def test_lambda_gateway_handler_mock():
    from io import BytesIO

    from chhaya_backend.local_server import LambdaGatewayHandler

    class DummyServer:
        pass

    class MockSocket:
        def __init__(self, request_bytes):
            self.rfile = BytesIO(request_bytes)
            self.wfile = BytesIO()

        def makefile(self, mode, *args, **kwargs):
            if "r" in mode:
                return self.rfile
            return self.wfile

        def sendall(self, data):
            self.wfile.write(data)

    req_data = b"GET /health HTTP/1.1\r\nHost: localhost\r\n\r\n"
    sock = MockSocket(req_data)
    
    with mock_aws():
        os.environ["CHHAYA_TABLE"] = "test-chhaya"
        os.environ["CHHAYA_DATA_MODE"] = "fixture"
        LambdaGatewayHandler(sock, ("127.0.0.1", 12345), DummyServer())
        
        output = sock.wfile.getvalue().decode()
        assert "200 OK" in output
        assert "version" in output

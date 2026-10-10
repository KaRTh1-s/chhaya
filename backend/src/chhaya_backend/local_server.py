"""Local standalone HTTP server using Python stdlib http.server and in-process moto DynamoDB."""
import argparse
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

import boto3
from moto import mock_aws


def setup_mock_dynamodb(table_name: str, region: str):
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.create_table(
        TableName=table_name,
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
    table.meta.client.get_waiter("table_exists").wait(TableName=table_name)
    
    # Seed demo crews
    demo_crews = [
        {"id": "delhi-riders", "name": "Delhi Central Delivery Fleet", "city_id": "delhi", "job_type": "RIDER", "workload": "MODERATE", "size": 15},
        {"id": "chennai-const", "name": "Chennai Harbour Construction Crew", "city_id": "chennai", "job_type": "CONSTRUCTION", "workload": "HEAVY", "size": 30},
        {"id": "coimbatore-ven", "name": "Coimbatore Street Vendors Assoc", "city_id": "coimbatore", "job_type": "VENDOR", "workload": "LIGHT", "size": 10},
    ]
    for c in demo_crews:
        table.put_item(Item={
            "pk": f"CREW#{c['id']}",
            "sk": "CREW",
            **c,
            "created_at": "2026-10-10T00:00:00+00:00",
        })

    # Seed initial global stats
    table.put_item(Item={
        "pk": "STATS#GLOBAL",
        "sk": "STATS",
        "plans_generated": 142,
        "hours_flagged": 418,
        "lead_time_sum": 384,
        "lead_time_count": 120,
    })

    return dynamodb

class LambdaGatewayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

    def _handle_request(self):
        try:
            from handlers.api import handler
        except ImportError:
            from backend.handlers.api import handler

        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query_dict = {}
        if parsed_url.query:
            raw_query = parse_qs(parsed_url.query)
            query_dict = {k: v[0] if len(v) == 1 else v for k, v in raw_query.items()}

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else None

        # Build API Gateway v2 event
        event = {
            "version": "2.0",
            "routeKey": f"{self.command} {path}",
            "rawPath": path,
            "rawQueryString": parsed_url.query,
            "headers": dict(self.headers),
            "queryStringParameters": query_dict,
            "requestContext": {
                "http": {
                    "method": self.command,
                    "path": path,
                    "protocol": "HTTP/1.1",
                    "sourceIp": self.client_address[0],
                    "userAgent": self.headers.get("User-Agent", ""),
                },
                "requestId": str(uuid.uuid4()),
            },
            "body": body,
            "isBase64Encoded": False,
        }

        response = handler(event, None)

        status_code = response.get("statusCode", 500)
        resp_headers = response.get("headers", {})
        resp_body = response.get("body", "")

        self.send_response(status_code)
        for k, v in resp_headers.items():
            self.send_header(k, v)
        self.end_headers()

        if resp_body:
            self.wfile.write(resp_body.encode("utf-8"))

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def do_DELETE(self):
        self._handle_request()

    def do_OPTIONS(self):
        self._handle_request()

def run_server(port: int = 8787, live: bool = False, passcode: str = "demo"):
    os.environ["CHHAYA_TABLE"] = "chhaya-data"
    os.environ["CHHAYA_DATA_MODE"] = "live" if live else "fixture"
    os.environ["WRITE_PASSCODE"] = passcode
    os.environ["AWS_REGION"] = "ap-south-1"
    os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
    os.environ["AWS_ACCESS_KEY_ID"] = "mock_key"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "mock_secret"

    # Start mock AWS context for DynamoDB
    mocker = mock_aws()
    mocker.start()

    setup_mock_dynamodb("chhaya-data", "ap-south-1")

    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, LambdaGatewayHandler)

    print("=" * 60)
    print("  CHHAYA LOCAL HTTP SERVER (API GATEWAY V2 + DYNAMODB)")
    print("=" * 60)
    print(f"  Server URL:      http://localhost:{port}")
    print(f"  Data Mode:       {'LIVE (Open-Meteo)' if live else 'FIXTURE (Local test data)'}")
    print(f"  Write Passcode:  {passcode}")
    print("  DynamoDB:        In-memory mock (moto) with seeded demo crews")
    print("  Press Ctrl+C to stop.")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down local server...")
    finally:
        httpd.server_close()
        mocker.stop()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chhaya Local Mock Server")
    parser.add_argument("--port", type=int, default=8787, help="Port to listen on (default: 8787)")
    parser.add_argument("--live", action="store_true", help="Use live Open-Meteo API instead of fixtures")
    parser.add_argument("--passcode", default="demo", help="Write passcode for X-Chhaya-Passcode header")
    args = parser.parse_args()

    run_server(port=args.port, live=args.live, passcode=args.passcode)

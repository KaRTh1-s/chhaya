"""HTTP helpers for API Gateway v2 responses, CORS, and error handling."""
import json
import secrets
from typing import Any


def get_header(event: dict[str, Any], header_name: str) -> str | None:
    headers = event.get("headers", {}) or {}
    lower_name = header_name.lower()
    for k, v in headers.items():
        if k.lower() == lower_name:
            return v
    return None

def build_response(
    status_code: int,
    body: Any,
    cors_origin: str = "*",
    extra_headers: dict[str, str] | None = None
) -> dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": cors_origin,
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Chhaya-Passcode,Authorization",
    }
    if extra_headers:
        headers.update(extra_headers)

    body_str = body if isinstance(body, str) else json.dumps(body)

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": body_str,
        "isBase64Encoded": False,
    }

def error_response(
    status_code: int,
    code: str,
    message: str,
    cors_origin: str = "*"
) -> dict[str, Any]:
    return build_response(
        status_code=status_code,
        body={"error": {"code": code, "message": message}},
        cors_origin=cors_origin,
    )

def verify_passcode(event: dict[str, Any], expected_passcode: str) -> bool:
    provided = get_header(event, "X-Chhaya-Passcode")
    if not provided:
        return False
    return secrets.compare_digest(provided.strip(), expected_passcode.strip())

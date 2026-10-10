"""Dedicated AWS Lambda entry point handler for Chhaya Advisory Agent."""
import json
import logging
import time
import uuid
from typing import Any

from chhaya_backend.http import error_response
from chhaya_backend.router import Router

logger = logging.getLogger()
logger.setLevel(logging.INFO)

_router = None

def get_router():
    global _router
    if _router is None:
        _router = Router()
    return _router

def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    start_time = time.time()
    req_id = (
        event.get("requestContext", {}).get("requestId")
        or getattr(context, "aws_request_id", None)
        or str(uuid.uuid4())
    )
    
    http_info = event.get("requestContext", {}).get("http", {})
    method = http_info.get("method") or event.get("httpMethod") or "UNKNOWN"
    path = event.get("rawPath") or event.get("path") or "/advise"

    logger.info(json.dumps({
        "requestId": req_id,
        "action": "ADVISOR_REQUEST_START",
        "method": method,
        "path": path,
    }))

    try:
        router = get_router()
        response = router.route(event, context)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        logger.info(json.dumps({
            "requestId": req_id,
            "action": "ADVISOR_REQUEST_END",
            "statusCode": response.get("statusCode"),
            "durationMs": duration_ms,
        }))
        return response
    except Exception as exc:  # noqa: BLE001
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(json.dumps({
            "requestId": req_id,
            "action": "ADVISOR_REQUEST_ERROR",
            "error": str(exc),
            "durationMs": duration_ms,
        }))
        return error_response(500, "INTERNAL_SERVER_ERROR", "An unexpected advisor error occurred.")

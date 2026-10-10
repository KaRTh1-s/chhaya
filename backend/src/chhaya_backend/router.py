"""Hand-written router mapping API Gateway v2 HTTP events to service handlers."""
import json
import re
from datetime import UTC, datetime
from typing import Any

from chhaya_engine.cities import list_cities

from chhaya_backend.config import get_config
from chhaya_backend.http import build_response, error_response, verify_passcode
from chhaya_backend.services.audit_service import AuditService
from chhaya_backend.services.board_service import BoardService
from chhaya_backend.services.crew_service import CrewService
from chhaya_backend.services.plan_service import PlanService
from chhaya_backend.services.stats_service import StatsService
from chhaya_backend.store import DynamoDBStore

# Route definitions for OpenAPI contract parity test
REGISTERED_ROUTES = [
    ("GET", "/health"),
    ("GET", "/cities"),
    ("GET", "/scenarios"),
    ("POST", "/plan"),
    ("GET", "/board"),
    ("GET", "/stats"),
    ("GET", "/audit"),
    ("GET", "/crews"),
    ("POST", "/crews"),
    ("GET", "/crews/{id}"),
    ("DELETE", "/crews/{id}"),
]

class Router:
    def __init__(self, store: DynamoDBStore | None = None):
        self.config = get_config()
        self.store = store or DynamoDBStore()
        self.audit_service = AuditService(self.store)
        self.stats_service = StatsService(self.store)
        self.plan_service = PlanService(self.store, self.audit_service, self.stats_service)
        self.board_service = BoardService(self.plan_service)
        self.crew_service = CrewService(self.store, self.plan_service, self.audit_service)

    def route(self, event: dict[str, Any], context: Any = None) -> dict[str, Any]:
        # Extract HTTP method and path
        http_ctx = event.get("requestContext", {}).get("http", {})
        method = (http_ctx.get("method") or event.get("httpMethod") or "GET").upper()
        raw_path = event.get("rawPath") or event.get("path") or "/"
        
        # Strip trailing slash except for root
        path = raw_path.rstrip("/") if len(raw_path) > 1 else raw_path

        # Handle CORS preflight
        if method == "OPTIONS":
            return build_response(200, {"ok": True}, cors_origin=self.config.cors_origin)

        # 1. Health
        if method == "GET" and path == "/health":
            return self.handle_health()

        # 2. Cities
        if method == "GET" and path == "/cities":
            return self.handle_cities()

        # 2b. Scenarios
        if method == "GET" and path == "/scenarios":
            return self.handle_scenarios()

        # 3. Plan
        if method == "POST" and path == "/plan":
            return self.handle_plan(event)

        # 4. Risk Board
        if method == "GET" and path == "/board":
            return self.handle_board(event)

        # 5. Stats
        if method == "GET" and path == "/stats":
            return self.handle_stats()

        # 6. Audit
        if method == "GET" and path == "/audit":
            return self.handle_audit(event)

        # 7. Crews List / Create
        if method == "GET" and path == "/crews":
            return self.handle_list_crews()

        if method == "POST" and path == "/crews":
            return self.handle_create_crew(event)

        # 8. Single Crew (GET / DELETE)
        crew_match = re.match(r"^/crews/([^/]+)$", path)
        if crew_match:
            crew_id = crew_match.group(1)
            if method == "GET":
                return self.handle_get_crew(crew_id)
            if method == "DELETE":
                return self.handle_delete_crew(event, crew_id)

        # 404 Not Found
        return error_response(404, "NOT_FOUND", f"Route {method} {path} not found", cors_origin=self.config.cors_origin)

    def handle_health(self) -> dict[str, Any]:
        return build_response(200, {
            "status": "ok",
            "version": self.config.app_version,
            "region": self.config.aws_region,
            "data_mode": self.config.data_mode,
            "time": datetime.now(UTC).isoformat(),
        }, cors_origin=self.config.cors_origin)

    def handle_cities(self) -> dict[str, Any]:
        cities = list_cities()
        data = [{
            "id": c.id,
            "name": c.name,
            "lat": c.lat,
            "lon": c.lon,
            "state": c.state,
        } for c in cities]
        return build_response(200, {"cities": data}, cors_origin=self.config.cors_origin)

    def handle_scenarios(self) -> dict[str, Any]:
        from chhaya_engine.scenarios import list_scenarios
        scenarios = list_scenarios()
        return build_response(200, {"scenarios": [s.to_dict() for s in scenarios]}, cors_origin=self.config.cors_origin)

    def handle_plan(self, event: dict[str, Any]) -> dict[str, Any]:
        body = event.get("body")
        if not body:
            return error_response(400, "INVALID_REQUEST", "Missing request body", cors_origin=self.config.cors_origin)

        try:
            payload = json.loads(body) if isinstance(body, str) else body
        except (json.JSONDecodeError, TypeError, ValueError):
            return error_response(400, "INVALID_JSON", "Malformed JSON body", cors_origin=self.config.cors_origin)

        params, err = self.plan_service.validate_plan_request(payload)
        if err:
            status_code = 404 if "Unknown" in err or "not found" in err.lower() else 400
            error_code = "NOT_FOUND" if status_code == 404 else "VALIDATION_ERROR"
            return error_response(status_code, error_code, err, cors_origin=self.config.cors_origin)

        plan_dict = self.plan_service.generate_plan(params)
        return build_response(200, plan_dict, cors_origin=self.config.cors_origin)

    def handle_board(self, event: dict[str, Any]) -> dict[str, Any]:
        params = event.get("queryStringParameters") or {}
        mode = params.get("mode", "live").lower()
        board_data = self.board_service.get_risk_board(mode=mode)
        return build_response(200, board_data, cors_origin=self.config.cors_origin)

    def handle_stats(self) -> dict[str, Any]:
        stats_data = self.stats_service.get_global_stats()
        return build_response(200, stats_data, cors_origin=self.config.cors_origin)

    def handle_audit(self, event: dict[str, Any]) -> dict[str, Any]:
        params = event.get("queryStringParameters") or {}
        limit = 50
        if "limit" in params:
            try:
                limit = max(1, min(100, int(params["limit"])))
            except (ValueError, TypeError):
                limit = 50

        events = self.audit_service.get_recent_events(limit=limit)
        return build_response(200, {"audit_events": events}, cors_origin=self.config.cors_origin)

    def handle_list_crews(self) -> dict[str, Any]:
        crews = self.crew_service.list_crews()
        return build_response(200, {"crews": crews}, cors_origin=self.config.cors_origin)

    def handle_create_crew(self, event: dict[str, Any]) -> dict[str, Any]:
        if not verify_passcode(event, self.config.write_passcode):
            return error_response(401, "UNAUTHORIZED", "Invalid or missing X-Chhaya-Passcode header", cors_origin=self.config.cors_origin)

        body = event.get("body")
        if not body:
            return error_response(400, "INVALID_REQUEST", "Missing request body", cors_origin=self.config.cors_origin)

        try:
            payload = json.loads(body) if isinstance(body, str) else body
        except (json.JSONDecodeError, TypeError, ValueError):
            return error_response(400, "INVALID_JSON", "Malformed JSON body", cors_origin=self.config.cors_origin)

        data, err = self.crew_service.validate_create_crew(payload)
        if err:
            return error_response(400, "VALIDATION_ERROR", err, cors_origin=self.config.cors_origin)

        created = self.crew_service.create_crew(data)
        return build_response(201, {"crew": created}, cors_origin=self.config.cors_origin)

    def handle_get_crew(self, crew_id: str) -> dict[str, Any]:
        crew_with_plan = self.crew_service.get_crew_with_plan(crew_id)
        if not crew_with_plan:
            return error_response(404, "CREW_NOT_FOUND", f"Crew '{crew_id}' not found", cors_origin=self.config.cors_origin)
        return build_response(200, {"crew": crew_with_plan}, cors_origin=self.config.cors_origin)

    def handle_delete_crew(self, event: dict[str, Any], crew_id: str) -> dict[str, Any]:
        if not verify_passcode(event, self.config.write_passcode):
            return error_response(401, "UNAUTHORIZED", "Invalid or missing X-Chhaya-Passcode header", cors_origin=self.config.cors_origin)

        deleted = self.crew_service.delete_crew(crew_id)
        if not deleted:
            return error_response(404, "CREW_NOT_FOUND", f"Crew '{crew_id}' not found", cors_origin=self.config.cors_origin)
        return build_response(200, {"deleted": True, "crew_id": crew_id}, cors_origin=self.config.cors_origin)

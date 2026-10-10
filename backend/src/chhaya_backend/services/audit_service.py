"""Audit service for logging system events without PII."""
from typing import Any

from chhaya_backend.store import DynamoDBStore


class AuditService:
    def __init__(self, store: DynamoDBStore):
        self.store = store

    def log_event(self, event_type: str, details: dict[str, Any]) -> dict[str, Any]:
        return self.store.add_audit_event(event_type, details)

    def get_recent_events(self, limit: int = 50) -> list[dict[str, Any]]:
        return self.store.get_audit_events(limit=limit)

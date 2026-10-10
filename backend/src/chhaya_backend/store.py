"""DynamoDB single-table store for Chhaya Backend."""
import json
import time
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError

from chhaya_backend.config import get_config


class DynamoDBStore:
    def __init__(self, table_name: str | None = None, dynamodb_resource=None):
        self.config = get_config()
        self.table_name = table_name or self.config.table_name
        self._dynamodb = dynamodb_resource
        self._table = None

    @property
    def dynamodb(self):
        if self._dynamodb is None:
            self._dynamodb = boto3.resource("dynamodb", region_name=self.config.aws_region)
        return self._dynamodb

    @property
    def table(self):
        if self._table is None:
            self._table = self.dynamodb.Table(self.table_name)
        return self._table


    # --- Readings Cache ---
    def get_readings_cache(self, lat_lon_key: str) -> list[dict[str, Any]] | None:
        try:
            resp = self.table.get_item(
                Key={"pk": f"READINGS#{lat_lon_key}", "sk": "READINGS"}
            )
            item = resp.get("Item")
            if not item:
                return None
            
            # Check TTL
            now_ts = int(time.time())
            if item.get("ttl", 0) < now_ts:
                return None
                
            return json.loads(item["readings_json"])
        except ClientError:
            return None

    def put_readings_cache(self, lat_lon_key: str, readings: list[dict[str, Any]], ttl_seconds: int = 1800) -> None:
        try:
            now_ts = int(time.time())
            self.table.put_item(
                Item={
                    "pk": f"READINGS#{lat_lon_key}",
                    "sk": "READINGS",
                    "readings_json": json.dumps(readings),
                    "ttl": now_ts + ttl_seconds,
                    "cached_at": datetime.now(UTC).isoformat(),
                }
            )
        except ClientError:
            pass

    # --- Crew Operations ---
    def save_crew(self, crew_data: dict[str, Any]) -> dict[str, Any]:
        crew_id = crew_data.get("id") or str(uuid.uuid4())[:8]
        now_iso = datetime.now(UTC).isoformat()
        db_item = {
            "pk": f"CREW#{crew_id}",
            "sk": "CREW",
            "id": crew_id,
            "name": str(crew_data["name"]),
            "city_id": str(crew_data["city_id"]),
            "job_type": str(crew_data["job_type"]),
            "workload": str(crew_data.get("workload", "MODERATE")),
            "size": int(crew_data.get("size", 1)),
            "created_at": crew_data.get("created_at", now_iso),
        }
        self.table.put_item(Item=db_item)
        return {
            "id": db_item["id"],
            "name": db_item["name"],
            "city_id": db_item["city_id"],
            "job_type": db_item["job_type"],
            "workload": db_item["workload"],
            "size": db_item["size"],
            "created_at": db_item["created_at"],
        }

    def get_crew(self, crew_id: str) -> dict[str, Any] | None:
        try:
            resp = self.table.get_item(Key={"pk": f"CREW#{crew_id}", "sk": "CREW"})
            item = resp.get("Item")
            if not item:
                return None
            return {
                "id": str(item.get("id", crew_id)),
                "name": str(item.get("name", "")),
                "city_id": str(item.get("city_id", "")),
                "job_type": str(item.get("job_type", "")),
                "workload": str(item.get("workload", "MODERATE")),
                "size": int(item.get("size", 1)),
                "created_at": str(item.get("created_at", "")),
            }
        except ClientError:
            return None

    def list_crews(self) -> list[dict[str, Any]]:
        try:
            resp = self.table.scan(
                FilterExpression="begins_with(pk, :prefix) AND sk = :sk",
                ExpressionAttributeValues={":prefix": "CREW#", ":sk": "CREW"}
            )
            items = resp.get("Items", [])
            crews = []
            for it in items:
                crews.append({
                    "id": str(it.get("id", "")),
                    "name": str(it.get("name", "")),
                    "city_id": str(it.get("city_id", "")),
                    "job_type": str(it.get("job_type", "")),
                    "workload": str(it.get("workload", "MODERATE")),
                    "size": int(it.get("size", 1)),
                    "created_at": str(it.get("created_at", "")),
                })
            return crews
        except ClientError:
            return []

    def delete_crew(self, crew_id: str) -> bool:
        try:
            self.table.delete_item(Key={"pk": f"CREW#{crew_id}", "sk": "CREW"})
            return True
        except ClientError:
            return False

    # --- Stats (Atomic Counters) ---
    def increment_stats(
        self,
        plans: int = 0,
        hours_flagged: int = 0,
        lead_time_sum: float = 0.0,
        lead_time_count: int = 0,
        advisories: int = 0,
        llm_first_pass_valid: int = 0,
    ) -> None:
        try:
            update_expr_parts = []
            expr_attr_values = {}
            if plans > 0:
                update_expr_parts.append("plans_generated :p")
                expr_attr_values[":p"] = plans
            if hours_flagged > 0:
                update_expr_parts.append("hours_flagged :f")
                expr_attr_values[":f"] = hours_flagged
            if lead_time_count > 0:
                update_expr_parts.append("lead_time_sum :lts")
                update_expr_parts.append("lead_time_count :ltc")
                expr_attr_values[":lts"] = Decimal(str(round(lead_time_sum, 2)))
                expr_attr_values[":ltc"] = lead_time_count
            if advisories > 0:
                update_expr_parts.append("advisories_generated :adv")
                expr_attr_values[":adv"] = advisories
            if llm_first_pass_valid > 0:
                update_expr_parts.append("llm_first_pass_valid_count :fpv")
                expr_attr_values[":fpv"] = llm_first_pass_valid

            if not update_expr_parts:
                return

            update_expr = "ADD " + ", ".join(update_expr_parts)
            self.table.update_item(
                Key={"pk": "STATS#GLOBAL", "sk": "STATS"},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_attr_values,
            )
        except ClientError:
            pass

    def get_stats(self) -> dict[str, Any]:
        try:
            resp = self.table.get_item(Key={"pk": "STATS#GLOBAL", "sk": "STATS"})
            item = resp.get("Item", {})
            plans = int(item.get("plans_generated", 0))
            flagged = int(item.get("hours_flagged", 0))
            lts = float(item.get("lead_time_sum", 0.0))
            ltc = int(item.get("lead_time_count", 0))
            avg_lead = round(lts / ltc, 1) if ltc > 0 else 0.0
            advisories = int(item.get("advisories_generated", 0))
            fpv = int(item.get("llm_first_pass_valid_count", 0))
            fp_rate = round(fpv / advisories, 3) if advisories > 0 else None

            return {
                "plans_generated": plans,
                "hours_flagged": flagged,
                "avg_lead_time_hours": avg_lead,
                "advisories_generated": advisories,
                "llm_first_pass_valid_rate": fp_rate,
                "alerts_sent": 0,
            }
        except ClientError:
            return {
                "plans_generated": 0,
                "hours_flagged": 0,
                "avg_lead_time_hours": 0.0,
                "advisories_generated": 0,
                "llm_first_pass_valid_rate": None,
                "alerts_sent": 0,
            }

    # --- Daily LLM Call Rate Limiter ---
    def increment_daily_llm_calls(self, max_calls: int = 300) -> tuple[bool, int]:
        """Increment daily LLM call counter and check against max_calls cap.
        Returns (is_allowed, current_count).
        """
        today_str = datetime.now(UTC).strftime("%Y-%m-%d")
        pk = f"LLM_CALLS#{today_str}"
        sk = "COUNT"
        try:
            resp = self.table.update_item(
                Key={"pk": pk, "sk": sk},
                UpdateExpression="ADD #count :one",
                ExpressionAttributeNames={"#count": "count"},
                ExpressionAttributeValues={":one": 1},
                ReturnValues="UPDATED_NEW"
            )
            count = int(resp.get("Attributes", {}).get("count", 1))
            return (count <= max_calls), count
        except ClientError:
            return True, 1

    # --- Audit Log ---
    def add_audit_event(self, event_type: str, details: dict[str, Any]) -> dict[str, Any]:
        event_id = str(uuid.uuid4())[:8]
        now = datetime.now(UTC)
        date_str = now.strftime("%Y-%m-%d")
        ts_str = now.isoformat()
        ttl_ts = int(time.time()) + (30 * 86400) # 30 days retention

        # Ensure no PII in details
        sanitized_details = {k: v for k, v in details.items() if k not in ("name", "phone", "email", "worker_name")}

        item = {
            "pk": f"AUDIT#{date_str}",
            "sk": f"{ts_str}#{event_id}",
            "id": event_id,
            "event_type": event_type,
            "details_json": json.dumps(sanitized_details),
            "timestamp": ts_str,
            "ttl": ttl_ts,
        }
        try:
            self.table.put_item(Item=item)
        except ClientError:
            pass
        return {
            "id": event_id,
            "event_type": event_type,
            "timestamp": ts_str,
            "details": sanitized_details,
        }

    def get_audit_events(self, limit: int = 50) -> list[dict[str, Any]]:
        try:
            resp = self.table.scan(
                FilterExpression="begins_with(pk, :prefix)",
                ExpressionAttributeValues={":prefix": "AUDIT#"}
            )
            items = resp.get("Items", [])
            items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            results = []
            for it in items[:limit]:
                results.append({
                    "id": str(it.get("id", "")),
                    "event_type": str(it.get("event_type", "")),
                    "timestamp": str(it.get("timestamp", "")),
                    "details": json.loads(it.get("details_json", "{}")),
                })
            return results
        except ClientError:
            return []

"""Test contract parity between OpenAPI 3.0 specification and backend router routes."""
from pathlib import Path

import yaml

from chhaya_backend.router import REGISTERED_ROUTES


def test_openapi_contract_parity():
    openapi_path = Path(__file__).resolve().parent.parent.parent / "docs" / "openapi.yaml"
    assert openapi_path.exists(), f"OpenAPI contract missing at {openapi_path}"

    with open(openapi_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    openapi_routes = set()
    paths = spec.get("paths", {})
    for path, methods in paths.items():
        for method in methods:
            if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                openapi_routes.add((method.upper(), path))

    router_routes = set(REGISTERED_ROUTES)

    # Assert all router routes exist in OpenAPI
    missing_in_openapi = router_routes - openapi_routes
    assert not missing_in_openapi, f"Routes in router but missing in openapi.yaml: {missing_in_openapi}"

    # Assert all OpenAPI routes exist in router
    missing_in_router = openapi_routes - router_routes
    assert not missing_in_router, f"Routes in openapi.yaml but missing in router: {missing_in_router}"

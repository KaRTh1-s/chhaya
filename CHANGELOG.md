# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-10-10
### Added
- Structured hydration guidance in `DayPlan` and `HourPlan.hydration` ("NORMAL" | "FREQUENT") derived strictly from heat stress without air-pollution false triggers.
- Replay scenarios endpoint `GET /scenarios` returning 4 historical high-impact Indian weather days.
- `POST /plan` scenario replay mode anchoring evaluation date and returning source tracking metadata (`data_source`, `scenario_id`, `recorded_date`).
- `GET /board?mode=replay` matrix evaluation over all 4 recorded scenarios.
- Dev-only calibration script `scripts/calibrate_wbgt.py` against Liljegren outdoor reference model (`thermofeel`).
- Automated response hygiene tests asserting no DynamoDB storage keys (`pk`, `sk`, `ttl`) leak to callers.

### Changed
- Calibrated WBGT model with `SOLAR_ADJ_C_PER_KW_M2 = 2.0` and `CALIBRATION_OFFSET_C = -4.5`, reducing hot-dry mean bias from +4.76°C to +0.06°C.
- `recommended_blocks` algorithm selects up to 2 non-overlapping blocks minimizing combined risk (WORK > CAUTION > REDUCED, never AVOID) with block status reflecting worst hour inside.
- `/stats` honesty: counters start at 0 in production and demo seeding is gated strictly on `CHHAYA_SEED_DEMO=1`.

## [0.2.0] - 2026-10-10
### Added
- AWS SAM Backend infrastructure on Lambda (`python3.11`, `arm64`), HTTP API Gateway v2, and DynamoDB.
- Single-table DynamoDB storage engine for reading caches (30-min TTL), crew management, atomic global stats counters, and 30-day append-only audit trail without PII.
- Hand-written lightweight router supporting `/health`, `/cities`, `/plan`, `/board`, `/stats`, `/audit`, and `/crews` CRUD with constant-time `X-Chhaya-Passcode` validation.
- Local mock server runner (`scripts/dev.ps1 serve`) with in-process `moto` DynamoDB and pre-seeded demo fleets.
- OpenAPI 3.0 contract specification at `docs/openapi.yaml` with automated parity tests.
- Backend build script `scripts/build_backend.ps1` packaging `chhaya_engine` alongside Lambda handlers.

## [0.1.1] - 2026-10-10
### Fixed
- Window `summary_code` now computes dominant reason across the merged block based on severity hierarchy and non-safe frequency.
- Heat tier boundaries strictly validated against spec and covered with table-driven tests.

### Added
- `DayPlan.recommended_blocks` and `DayPlan.no_safe_window` with CLI representation.
- `scripts/record_fixture.py` recording real hourly weather and AQI archive data for Delhi, Chennai, and Coimbatore.
- Monotonicity, evidence ID, and shift clipping audit tests.

## [0.1.0] - 2026-10-10
### Added
- Core planner engine logic (WBGT, AQI, Work/Rest schedules).
- CPCB AQI rules and Workload multipliers.
- CLI application to run plans locally (`chhaya_engine.cli`).
- Fixtures and test suite for the engine.

## [0.0.1] - 2026-10-09
### Added
- Initial project scaffolding for Phase 0.
- Monorepo structure with engine, backend, and web packages.
- CI workflows and Makefile setup.
